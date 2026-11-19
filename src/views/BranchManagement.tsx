import { useState, type FormEvent } from 'react';
import { Building2, Plus } from 'lucide-react';
import { useMfi } from '../context/MfiContext';

const emptyBranch = { code: '', name: '', region: '', address: '', phone: '' };

export function BranchManagement() {
  const { createBranch, branches, language } = useMfi();
  const sw = language === 'sw';
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(emptyBranch);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedName, setSavedName] = useState('');

  const fields = [
    { key: 'code', label: sw ? 'Msimbo wa tawi' : 'Branch code', maxLength: 20 },
    { key: 'name', label: sw ? 'Jina la tawi' : 'Branch name', maxLength: 120 },
    { key: 'region', label: sw ? 'Mkoa' : 'Region', maxLength: 80 },
    { key: 'address', label: sw ? 'Anwani' : 'Address', maxLength: 240 },
    { key: 'phone', label: sw ? 'Simu ya ofisi' : 'Office phone', maxLength: 30 },
  ] as const;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const branch = await createBranch(details);
      setSavedName(branch.name);
      setDetails(emptyBranch);
      setOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : sw ? 'Tawi halijahifadhiwa.' : 'Could not save the branch.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="branch-management-title" className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="branch-management-title" className="flex items-center gap-2 text-base font-bold text-white">
          <Building2 size={18} aria-hidden />
          {sw ? 'Usimamizi wa Matawi' : 'Branch Management'}
        </h2>
        <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); setError(''); }}
          disabled={saving} className="imara-button is-primary">
          <Plus size={16} aria-hidden /> {sw ? 'Ongeza Tawi' : 'Add Branch'}
        </button>
      </div>
      {savedName && <p role="status" className="text-sm text-emerald-400">
        {sw ? `${savedName} limeongezwa.` : `${savedName} was added.`}
      </p>}
      {open && (
        <form onSubmit={save} className="grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
          {fields.map(({ key, label, maxLength }) => (
            <label key={key} className="grid gap-1 text-sm font-medium text-slate-300">
              {label}
              <input required type={key === 'phone' ? 'tel' : 'text'} maxLength={maxLength} value={details[key]}
                onChange={(event) => setDetails({ ...details, [key]: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            </label>
          ))}
          {error && <p role="alert" className="text-sm text-rose-400 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="imara-button is-primary disabled:opacity-50">
              {saving ? (sw ? 'Inahifadhi…' : 'Saving…') : (sw ? 'Hifadhi Tawi' : 'Save Branch')}
            </button>
          </div>
        </form>
      )}
      {branches.length > 0 ? (
        <ul className="divide-y divide-slate-800 text-sm">
          {branches.map((branch) => (
            <li key={branch.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="font-semibold text-white">{branch.name}</span>
              <span className="text-slate-400">{branch.code} · {branch.region}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-400">{sw ? 'Hakuna tawi lililosajiliwa.' : 'No branches registered yet.'}</p>}
    </section>
  );
}
