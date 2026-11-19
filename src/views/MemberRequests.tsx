import { useEffect, useState } from 'react';
import { useMfi } from '../context/MfiContext';

type RequestRow = {
  id: string;
  customerName: string;
  requestedBy: string;
  kind: 'CREATE' | 'REMOVE';
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  phone?: string;
  branchId?: string;
};

export function MemberRequests({ version }: { version: number }) {
  const { authToken, currentUser, reviewMemberRequest, refreshWorkspace, language, branches } = useMfi();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewVersion, setReviewVersion] = useState(0);
  const sw = language === 'sw';
  const isAdmin = currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!authToken) return;
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/member-requests', {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load membership requests.');
      setRequests(await response.json());
    }).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [authToken, version, reviewVersion]);

  async function review(id: string, decision: 'APPROVED' | 'REJECTED') {
    setReviewing(id);
    setError('');
    try {
      await reviewMemberRequest(id, decision);
      setReviewVersion((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not review the request.');
    } finally {
      setReviewing(null);
    }
  }

  const statuses = { PENDING: 'Linasubiri', APPROVED: 'Limeidhinishwa', REJECTED: 'Limekataliwa' };

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">{sw ? 'Maombi ya Uanachama' : 'Membership Requests'}</h2>
        <button type="button" className="imara-button" onClick={() => { setError(''); setReviewVersion((value) => value + 1); void refreshWorkspace(); }} disabled={loading}>
          {sw ? 'Onyesha Upya' : 'Refresh'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      {loading && <p role="status" className="text-sm text-slate-400">{sw ? 'Inapakia…' : 'Loading…'}</p>}
      {!loading && !error && requests.length === 0 && <p className="text-sm text-slate-400">{sw ? 'Hakuna maombi.' : 'No requests yet.'}</p>}
      <ul className="divide-y divide-slate-800">
        {requests.map((item) => (
          <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
            <div className="space-y-1">
              <p className="font-semibold text-white">{item.customerName}</p>
              <p className="text-slate-400">
                {item.kind === 'CREATE' ? (sw ? 'Usajili' : 'Registration') : (sw ? 'Kuondoa' : 'Removal')}
                {' · '}{sw ? statuses[item.state] : item.state}
                {isAdmin ? ` · ${item.requestedBy}` : ''}
              </p>
              {item.reason && <p className="text-slate-300">{item.reason}</p>}
              {item.phone && isAdmin && <p className="text-slate-400">{item.phone} · {branches.find((branch) => branch.id === item.branchId)?.name}</p>}
            </div>
            {isAdmin && item.state === 'PENDING' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={reviewing !== null || loading} onClick={() => void review(item.id, 'REJECTED')} className="imara-button">
                  {sw ? 'Kataa' : 'Reject'}
                </button>
                <button type="button" disabled={reviewing !== null || loading} onClick={() => void review(item.id, 'APPROVED')} className="imara-button is-primary">
                  {sw ? 'Idhinisha' : 'Approve'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
