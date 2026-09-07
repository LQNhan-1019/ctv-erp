'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { createGoal, listGoals, listPerformanceMetrics, updateGoal } from '../api/performance-api';
import type { Goal, GoalFramework, GoalInput, GoalStatus, PerformanceMetric } from '../types/performance';

type Draft = {
  framework: GoalFramework;
  title: string;
  target: string;
  weight: string;
  status: GoalStatus;
};

const unitLabel: Record<string, string> = {
  MILLION_VND: 'triệu đồng', COUNT: 'SL', CUBIC_METER: 'm³', KM: 'km',
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function GoalManagementPage() {
  const { request, user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [department, setDepartment] = useState('ALL');
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const canManage = user?.permissions.includes('PERFORMANCE.GOAL.MANAGE') ?? false;

  useEffect(() => {
    let active = true;
    Promise.all([listPerformanceMetrics(request), listGoals(request, month)])
      .then(([metricItems, goalItems]) => {
        if (!active) return;
        setMetrics(metricItems);
        setGoals(goalItems);
        const byMetric = new Map(goalItems.map((goal) => [goal.metricId, goal]));
        setDrafts(Object.fromEntries(metricItems.map((metric) => {
          const goal = byMetric.get(metric.id);
          return [metric.id, {
            framework: goal?.framework ?? 'KPI',
            title: goal?.objectiveTitle ?? metric.name,
            target: goal ? String(goal.targetValue) : '',
            weight: goal ? String(goal.weightPercent) : '100',
            status: goal?.status ?? 'ACTIVE',
          } satisfies Draft];
        })));
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, request]);

  const departments = useMemo(() => Array.from(new Map(metrics.map((metric) => [
    metric.departmentCode, metric.departmentName,
  ])).entries()), [metrics]);
  const visible = department === 'ALL' ? metrics : metrics.filter((metric) => metric.departmentCode === department);
  const goalByMetric = useMemo(() => new Map(goals.map((goal) => [goal.metricId, goal])), [goals]);

  function patchDraft(metricId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [metricId]: { ...current[metricId], ...patch } }));
  }

  async function save(metric: PerformanceMetric) {
    const draft = drafts[metric.id];
    const targetValue = Number(draft.target);
    const weightPercent = Number(draft.weight);
    if (!draft.title.trim() || !Number.isFinite(targetValue) || targetValue <= 0) {
      setError('Tên mục tiêu và giá trị mục tiêu lớn hơn 0 là bắt buộc.');
      return;
    }
    const body: GoalInput = {
      metricId: metric.id,
      framework: draft.framework,
      objectiveTitle: draft.title.trim(),
      month,
      targetValue,
      weightPercent,
      status: draft.status,
    };
    setSaving(metric.id); setError(''); setMessage('');
    try {
      const existing = goalByMetric.get(metric.id);
      const saved = existing
        ? await updateGoal(request, existing.id, body)
        : await createGoal(request, body);
      setGoals((current) => [...current.filter((item) => item.metricId !== metric.id), saved]);
      setMessage(`Đã lưu mục tiêu “${metric.name}” cho ${month}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu mục tiêu');
    } finally {
      setSaving('');
    }
  }

  return (
    <div className="nova-account-page performance-page">
      <header className="nova-page-header performance-header">
        <div><p className="nova-eyebrow">KPI · OKR · BSC · MBO</p><h1>Giao và theo dõi mục tiêu</h1><span>Mỗi chỉ số có một mục tiêu theo tháng; số thực hiện được lấy từ dữ liệu phòng ban đã nhập.</span></div>
        <label className="performance-month"><span>Tháng mục tiêu</span><input type="month" value={month} onChange={(event) => { setLoading(true); setError(''); setMonth(event.target.value); }} /></label>
      </header>
      <div className="performance-toolbar">
        <label><span>Phòng ban</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">Tất cả phòng ban</option>{departments.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        <div className="performance-legend"><span><i className="dot green" />Đã giao: {goals.length}</span><span><i className="dot gray" />Chưa giao: {metrics.length - goals.length}</span></div>
      </div>
      {message && <div className="performance-success"><Icon name="check" />{message}</div>}
      {error && <div className="performance-error"><Icon name="alert" />{error}</div>}
      {loading && <div className="performance-state"><span className="nova-session-spinner" />Đang tải danh sách chỉ số…</div>}
      {!loading && <div className="performance-goal-list">
        {visible.map((metric) => {
          const draft = drafts[metric.id];
          const goal = goalByMetric.get(metric.id);
          if (!draft) return null;
          return <article key={metric.id} className="performance-goal-row">
            <div className="performance-goal-identity"><span>{metric.departmentName} · {metric.subjectName}</span><h3>{metric.name}</h3><small>{unitLabel[metric.measurementUnit]} · {metric.aggregationMethod === 'SUM' ? 'Cộng các ngày' : 'Lấy ngày gần nhất'} · {metric.targetDirection === 'AT_MOST' ? 'Càng thấp càng tốt' : 'Càng cao càng tốt'}</small></div>
            <label><span>Phương pháp</span><select disabled={!canManage} value={draft.framework} onChange={(event) => patchDraft(metric.id, { framework: event.target.value as GoalFramework })}><option>KPI</option><option>OKR</option><option>BSC</option><option>MBO</option></select></label>
            <label className="goal-title"><span>Tên mục tiêu</span><input disabled={!canManage} value={draft.title} onChange={(event) => patchDraft(metric.id, { title: event.target.value })} /></label>
            <label><span>Giá trị mục tiêu</span><input disabled={!canManage} type="number" min="0.001" step="0.001" value={draft.target} placeholder="Chưa giao" onChange={(event) => patchDraft(metric.id, { target: event.target.value })} /></label>
            <label><span>Trọng số %</span><input disabled={!canManage} type="number" min="0.01" max="100" step="0.01" value={draft.weight} onChange={(event) => patchDraft(metric.id, { weight: event.target.value })} /></label>
            <label><span>Trạng thái</span><select disabled={!canManage} value={draft.status} onChange={(event) => patchDraft(metric.id, { status: event.target.value as GoalStatus })}><option value="DRAFT">Nháp</option><option value="ACTIVE">Đang áp dụng</option><option value="CLOSED">Đã chốt</option></select></label>
            <div className="performance-goal-action">{goal && <span className="goal-progress">{Math.round(goal.progressPercent)}%</span>}{canManage && <button className="nova-button primary" onClick={() => void save(metric)} disabled={saving === metric.id}><Icon name="save" />{saving === metric.id ? 'Đang lưu…' : goal ? 'Cập nhật' : 'Giao mục tiêu'}</button>}</div>
          </article>;
        })}
      </div>}
    </div>
  );
}
