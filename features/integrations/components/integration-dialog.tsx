'use client';

import { FormEvent, useState } from 'react';
import Icon from '@/components/ui/icon';
import type { ConnectionType, IntegrationConnection, IntegrationConnectionInput } from '../types/integration';

const typeLabels: Record<ConnectionType, string> = {
  SMTP: 'Máy chủ email (SMTP)',
  FILE_SERVER: 'Máy chủ lưu trữ',
  GOOGLE_DRIVE: 'Google Drive',
  AMIS_HR: 'MISA AMIS Nhân sự',
  AMIS_TIMESHEET: 'MISA AMIS Chấm công',
  AMIS_ACCOUNTING: 'MISA AMIS Kế toán',
  ATTENDANCE_DEVICE: 'Máy chấm công trực tiếp',
};

function field(data: FormData, name: string) {
  return String(data.get(name) ?? '').trim();
}

type AttendanceTransportProtocol = 'TCP_CONNECTOR' | 'UDP_LEGACY';

export default function IntegrationDialog({ connection, onClose, onSave }: {
  connection: IntegrationConnection | null;
  onClose: () => void;
  onSave: (input: IntegrationConnectionInput) => Promise<void>;
}) {
  const [type, setType] = useState<ConnectionType>(connection?.connectionType ?? 'SMTP');
  const [transportProtocol, setTransportProtocol] = useState<AttendanceTransportProtocol>(() => {
    const configured = connection?.configuration.transportProtocol;
    if (configured === 'TCP_CONNECTOR' || configured === 'UDP_LEGACY') return configured;
    return connection?.configuration.pullUrl || !connection ? 'TCP_CONNECTOR' : 'UDP_LEGACY';
  });
  const [useWebAddress, setUseWebAddress] = useState(() => connection?.configuration.useWebAddress === 'true' || connection?.configuration.connectionMode === 'DDNS');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const config = connection?.configuration ?? {};
  const secrets = connection?.secretRefs ?? {};

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const configuration: Record<string, string> = {};
    const secretRefs: Record<string, string> = {};

    if (type === 'SMTP') {
      configuration.host = field(data, 'host');
      configuration.port = field(data, 'port');
      configuration.username = field(data, 'username');
      configuration.fromAddress = field(data, 'fromAddress');
      configuration.security = field(data, 'security');
      configuration.connectionTimeoutMs = field(data, 'connectionTimeoutMs');
      configuration.readTimeoutMs = field(data, 'readTimeoutMs');
      const passwordEnv = field(data, 'passwordEnv');
      if (passwordEnv) secretRefs.passwordEnv = passwordEnv;
    } else if (type === 'FILE_SERVER') {
      configuration.baseDirectory = field(data, 'baseDirectory');
    } else if (type === 'GOOGLE_DRIVE') {
      configuration.folderId = field(data, 'folderId');
      secretRefs.credentialFileEnv = field(data, 'credentialFileEnv');
    } else if (type === 'AMIS_TIMESHEET' || type === 'AMIS_HR') {
      configuration.baseUrl = field(data, 'baseUrl');
      configuration.requestTimeoutMs = field(data, 'requestTimeoutMs');
      secretRefs.clientIdEnv = field(data, 'clientIdEnv');
      secretRefs.secretKeyEnv = field(data, 'secretKeyEnv');
    } else if (type === 'AMIS_ACCOUNTING') {
      configuration.baseUrl = field(data, 'baseUrl');
      configuration.appId = field(data, 'appId');
      configuration.organizationCode = field(data, 'organizationCode');
      configuration.requestTimeoutMs = field(data, 'requestTimeoutMs');
      secretRefs.accessCodeEnv = field(data, 'accessCodeEnv');
    } else {
      configuration.deviceCode = field(data, 'deviceCode');
      configuration.deviceName = field(data, 'deviceName');
      configuration.model = field(data, 'model');
      configuration.connectionMode = useWebAddress ? 'DDNS' : 'TCP_IP';
      configuration.transportProtocol = transportProtocol;
      const ipAddress = field(data, 'ipAddress');
      const webAddress = field(data, 'webAddress');
      if (ipAddress) configuration.ipAddress = ipAddress;
      if (webAddress) configuration.webAddress = webAddress;
      configuration.useWebAddress = String(useWebAddress);
      configuration.host = useWebAddress ? webAddress : ipAddress;
      configuration.port = field(data, 'port');
      configuration.machineNumber = field(data, 'machineNumber');
      configuration.timeoutMs = field(data, 'timeoutMs');
      configuration.defaultDirection = field(data, 'defaultDirection');
      configuration.baudRate = field(data, 'baudRate');
      const serialNumber = field(data, 'serialNumber');
      if (serialNumber) configuration.serialNumber = serialNumber;
      const registrationLimit = field(data, 'registrationLimit');
      if (registrationLimit) configuration.registrationLimit = registrationLimit;
      const pullUrl = field(data, 'pullUrl');
      if (pullUrl) configuration.pullUrl = pullUrl;
      const pushUrl = field(data, 'pushUrl');
      if (pushUrl) configuration.pushUrl = pushUrl;
      const communicationKeyEnv = field(data, 'communicationKeyEnv');
      if (communicationKeyEnv) secretRefs.communicationKeyEnv = communicationKeyEnv;
      const pullTokenEnv = field(data, 'pullTokenEnv');
      if (pullTokenEnv) secretRefs.pullTokenEnv = pullTokenEnv;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSave({
        code: connection ? undefined : field(data, 'code').toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        connectionType: connection ? undefined : type,
        name: field(data, 'name'),
        description: field(data, 'description'),
        configuration,
        secretRefs,
        active: data.get('active') === 'on',
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu kết nối');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nova-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="nova-dialog nova-integration-dialog" role="dialog" aria-modal="true" aria-labelledby="integration-dialog-title">
        <header><div><p>{connection ? 'CHỈNH SỬA KẾT NỐI' : 'KẾT NỐI MỚI'}</p><h2 id="integration-dialog-title">{connection ? connection.name : 'Thêm dịch vụ ngoài'}</h2><span>Chỉ lưu thông tin cấu hình và tên biến môi trường, không lưu mật khẩu hay credential.</span></div><button onClick={onClose} aria-label="Đóng"><Icon name="x" /></button></header>
        <form onSubmit={submit}>
          <div className="nova-dialog-body">
            <div className="nova-form-grid">
              <label><span>Mã kết nối</span><div className="nova-field"><Icon name="plug" /><input name="code" defaultValue={connection?.code} disabled={Boolean(connection)} minLength={3} maxLength={64} placeholder="VD. SMTP_CHINH" required /></div></label>
              <label><span>Loại dịch vụ</span><select name="connectionType" value={type} onChange={(event) => setType(event.target.value as ConnectionType)} disabled={Boolean(connection)}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            </div>
            <div className="nova-form-grid">
              <label><span>Tên hiển thị</span><input name="name" defaultValue={connection?.name} maxLength={128} placeholder="Tên dễ nhận biết" required /></label>
              <label className="nova-switch-label"><span>Trạng thái</span><div><input type="checkbox" name="active" defaultChecked={connection?.active ?? true} /><b>Cho phép sử dụng</b></div></label>
            </div>
            <label><span>Mô tả</span><textarea className="nova-textarea" name="description" defaultValue={connection?.description ?? ''} rows={2} maxLength={1000} /></label>

            <div className="nova-dialog-section-title"><span><Icon name={type === 'SMTP' ? 'mail' : type === 'FILE_SERVER' ? 'server' : type.startsWith('AMIS_') ? 'plug' : 'database'} /></span><div><b>{typeLabels[type]}</b><small>Thông số kết nối</small></div></div>
            {type === 'SMTP' && (
              <>
                <div className="nova-form-grid">
                  <label><span>Host</span><input name="host" defaultValue={config.host} placeholder="smtp.example.com" required /></label>
                  <label><span>Port</span><input name="port" type="number" min={1} max={65535} defaultValue={config.port ?? '587'} required /></label>
                </div>
                <div className="nova-form-grid">
                  <label><span>Tài khoản</span><input name="username" defaultValue={config.username} placeholder="mailer@example.com" /></label>
                  <label><span>Email gửi đi</span><input name="fromAddress" type="email" defaultValue={config.fromAddress} placeholder="no-reply@example.com" /></label>
                </div>
                <div className="nova-form-grid three">
                  <label><span>Bảo mật</span><select name="security" defaultValue={config.security ?? 'STARTTLS'}><option value="STARTTLS">STARTTLS</option><option value="SSL">SSL</option><option value="NONE">Không mã hóa</option></select></label>
                  <label><span>Timeout kết nối (ms)</span><input name="connectionTimeoutMs" type="number" min={1000} max={60000} defaultValue={config.connectionTimeoutMs ?? '5000'} /></label>
                  <label><span>Timeout đọc (ms)</span><input name="readTimeoutMs" type="number" min={1000} max={60000} defaultValue={config.readTimeoutMs ?? '5000'} /></label>
                </div>
                <label><span>Biến môi trường chứa mật khẩu</span><div className="nova-field"><Icon name="lock" /><input name="passwordEnv" defaultValue={secrets.passwordEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_SMTP_PASSWORD" /></div></label>
              </>
            )}
            {type === 'FILE_SERVER' && <label><span>Thư mục lưu trữ trên server</span><div className="nova-field"><Icon name="server" /><input name="baseDirectory" defaultValue={config.baseDirectory} placeholder="D:\ERP_BACKUPS hoặc /data/erp-backups" required /></div></label>}
            {type === 'GOOGLE_DRIVE' && (
              <div className="nova-form-grid">
                <label><span>Google Drive folder ID</span><div className="nova-field"><Icon name="database" /><input name="folderId" defaultValue={config.folderId} placeholder="1AbCdEf…" required /></div></label>
                <label><span>Biến môi trường chứa đường dẫn credential</span><div className="nova-field"><Icon name="lock" /><input name="credentialFileEnv" defaultValue={secrets.credentialFileEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_GDRIVE_CREDENTIAL_FILE" required /></div></label>
              </div>
            )}
            {type === 'AMIS_TIMESHEET' && (
              <>
                <label><span>Endpoint AMIS Chấm công</span><input name="baseUrl" type="url" defaultValue={config.baseUrl ?? 'https://amisapp.misa.vn/APIS/TimesheetOpenAPI/api/Open'} required /></label>
                <div className="nova-form-grid">
                  <label><span>Biến môi trường chứa mã kết nối</span><div className="nova-field"><Icon name="lock" /><input name="clientIdEnv" defaultValue={secrets.clientIdEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_AMIS_TIMESHEET_CLIENT_ID" required /></div></label>
                  <label><span>Biến môi trường chứa khóa bảo mật</span><div className="nova-field"><Icon name="lock" /><input name="secretKeyEnv" defaultValue={secrets.secretKeyEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_AMIS_TIMESHEET_SECRET_KEY" required /></div></label>
                </div>
                <label><span>Timeout request (ms)</span><input name="requestTimeoutMs" type="number" min={1000} max={120000} defaultValue={config.requestTimeoutMs ?? '30000'} required /></label>
              </>
            )}
            {type === 'AMIS_HR' && (
              <>
                <label><span>Endpoint AMIS Thông tin nhân sự</span><input name="baseUrl" type="url" defaultValue={config.baseUrl ?? 'https://amisapp.misa.vn/APIS/HRMProfileOpenAPI/api/Open'} required /></label>
                <div className="nova-form-grid">
                  <label><span>Biến môi trường chứa mã kết nối</span><div className="nova-field"><Icon name="lock" /><input name="clientIdEnv" defaultValue={secrets.clientIdEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_AMIS_HR_CLIENT_ID" required /></div></label>
                  <label><span>Biến môi trường chứa khóa bảo mật</span><div className="nova-field"><Icon name="lock" /><input name="secretKeyEnv" defaultValue={secrets.secretKeyEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_AMIS_HR_SECRET_KEY" required /></div></label>
                </div>
                <label><span>Timeout request (ms)</span><input name="requestTimeoutMs" type="number" min={1000} max={120000} defaultValue={config.requestTimeoutMs ?? '30000'} required /></label>
                <div className="nova-info-note"><Icon name="users" /><span>Kết nối này đọc cơ cấu tổ chức, vị trí công việc và hồ sơ nhân viên từ AMIS HR. Không dùng khóa của AMIS Chấm công nếu MISA cấp bộ khóa riêng.</span></div>
              </>
            )}
            {type === 'AMIS_ACCOUNTING' && (
              <>
                <label><span>Endpoint AMIS Kế toán</span><input name="baseUrl" type="url" defaultValue={config.baseUrl ?? 'https://actapp.misa.vn'} required /></label>
                <div className="nova-form-grid">
                  <label><span>App ID do MISA cấp</span><input name="appId" defaultValue={config.appId} pattern="[0-9a-fA-F-]{36}" placeholder="00000000-0000-0000-0000-000000000000" required /></label>
                  <label><span>Mã công ty đối tác</span><input name="organizationCode" defaultValue={config.organizationCode} pattern="[A-Za-z0-9._-]{2,128}" placeholder="ctv-petroleum" required /></label>
                </div>
                <div className="nova-form-grid">
                  <label><span>Biến môi trường chứa mã kết nối</span><div className="nova-field"><Icon name="lock" /><input name="accessCodeEnv" defaultValue={secrets.accessCodeEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_AMIS_ACCOUNTING_ACCESS_CODE" required /></div></label>
                  <label><span>Timeout request (ms)</span><input name="requestTimeoutMs" type="number" min={1000} max={120000} defaultValue={config.requestTimeoutMs ?? '30000'} required /></label>
                </div>
              </>
            )}
            {type === 'ATTENDANCE_DEVICE' && (
              <>
                <div className="nova-form-grid">
                  <label><span>Mã máy</span><input name="deviceCode" defaultValue={config.deviceCode ?? connection?.code ?? 'MCC00001'} pattern="[A-Za-z0-9_-]{2,32}" placeholder="MCC00001" required /></label>
                  <label><span>Tên máy</span><input name="deviceName" defaultValue={config.deviceName} placeholder="Máy MCC00001" required /></label>
                </div>
                <div className="nova-form-grid three">
                  <label><span>ID máy</span><input name="machineNumber" type="number" min={0} max={9999} defaultValue={config.machineNumber ?? '1'} required /></label>
                  <label><span>Loại máy</span><input name="model" defaultValue={config.model ?? 'ZKTECO_PERIOD'} placeholder="ZKTECO_PERIOD" required /></label>
                  <label><span>Kiểu kết nối</span><select name="transportProtocol" value={transportProtocol} onChange={(event) => setTransportProtocol(event.target.value as AttendanceTransportProtocol)}><option value="TCP_CONNECTOR">TCP/IP qua SDK</option><option value="UDP_LEGACY">UDP legacy</option></select></label>
                </div>
                <div className="nova-form-grid">
                  <label><span>Địa chỉ IP</span><input name="ipAddress" defaultValue={config.ipAddress ?? (!config.webAddress ? config.host : '')} placeholder="192.168.1.201" required={!useWebAddress} /></label>
                  <label><span>Cổng</span><input name="port" type="number" min={1} max={65535} defaultValue={config.port ?? '4370'} required /></label>
                </div>
                <div className="nova-form-grid three">
                  <label><span>Trạng thái máy</span><select name="defaultDirection" defaultValue={config.defaultDirection ?? 'IN'}><option value="IN">Vào</option><option value="OUT">Ra</option></select></label>
                  <label><span>Tốc độ truyền</span><select name="baudRate" defaultValue={config.baudRate ?? '115200'}><option value="9600">9600</option><option value="19200">19200</option><option value="38400">38400</option><option value="57600">57600</option><option value="115200">115200</option></select></label>
                  <label><span>Timeout (ms)</span><input name="timeoutMs" type="number" min={1000} max={60000} defaultValue={config.timeoutMs ?? '10000'} required /></label>
                </div>
                <div className="nova-form-grid">
                  <label><span>Địa chỉ Web / DDNS</span><input name="webAddress" defaultValue={config.webAddress ?? (config.connectionMode === 'DDNS' ? config.host : '')} placeholder="ctv0826.ddns.net" required={useWebAddress} /></label>
                  <label className="nova-switch-label"><span>Kết nối Internet</span><div><input type="checkbox" checked={useWebAddress} onChange={(event) => setUseWebAddress(event.target.checked)} /><b>Sử dụng địa chỉ web</b></div></label>
                </div>
                <div className="nova-form-grid">
                  <label><span>Seri thiết bị</span><input name="serialNumber" defaultValue={config.serialNumber} placeholder="1313250901558" maxLength={128} /></label>
                  <label><span>Số đăng ký tối đa</span><input name="registrationLimit" type="number" min={1} max={1000000} defaultValue={config.registrationLimit} placeholder="111992" /></label>
                </div>
                <label><span>Tên biến môi trường chứa mật khẩu kết nối</span><div className="nova-field"><Icon name="lock" /><input name="communicationKeyEnv" defaultValue={secrets.communicationKeyEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_ATTENDANCE_DEVICE_KEY" /></div></label>
                {transportProtocol === 'TCP_CONNECTOR' && <>
                  <div className="nova-form-grid">
                    <label><span>URL connector lấy log</span><input name="pullUrl" type="url" defaultValue={config.pullUrl} placeholder="http://host.docker.internal:8090/api/attendance/pull" required /></label>
                    <label><span>URL connector nạp nhân viên</span><input name="pushUrl" type="url" defaultValue={config.pushUrl} placeholder="http://host.docker.internal:8090/api/attendance/users" /></label>
                  </div>
                  <label><span>Tên biến môi trường chứa Bearer token connector</span><div className="nova-field"><Icon name="lock" /><input name="pullTokenEnv" defaultValue={secrets.pullTokenEnv} pattern="[A-Z][A-Z0-9_]{2,127}" placeholder="ERP_ATTENDANCE_CONNECTOR_TOKEN" /></div></label>
                </>}
                <div className="nova-info-note"><Icon name="alert" /><span>Chế độ TCP/IP dùng connector chạy SDK của hãng để đọc log và nạp nhân viên. URL nạp nhân viên chỉ bắt buộc khi sử dụng chức năng Quản lý máy; AMIS Chấm công không bị thay đổi.</span></div>
              </>
            )}
            <div className="nova-info-note"><Icon name="shield" /><span>Giá trị secret phải được cấu hình trong môi trường chạy backend. Giao diện này chỉ lưu tên biến để không làm lộ thông tin nhạy cảm.</span></div>
            {error && <div className="nova-form-error" role="alert">{error}</div>}
          </div>
          <footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button type="submit" className="nova-button primary" disabled={submitting}><Icon name="save" />{submitting ? 'Đang lưu…' : 'Lưu kết nối'}</button></footer>
        </form>
      </section>
    </div>
  );
}
