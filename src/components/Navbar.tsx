import React from 'react';
import {
  Building2,
  Globe,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
  Languages,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useMfi } from '../context/MfiContext';
import { translations } from '../lib/i18n';

export function Navbar() {
  const {
    logout, branches, currentBranchId, setCurrentBranchId, isOnline,
    offlineQueue, syncOfflineQueue, language, setLanguage,
  } = useMfi();
  const { showToast } = useToast();
  const t = translations[language];
  const pending = offlineQueue.filter((item) => item.syncStatus === 'PENDING').length;

  return (
    <header className="imara-topbar">
      <div className="imara-brand">
        <span className="imara-mark"><Building2 size={20} /></span>
        <span>Imara Finance<small>{language === 'sw' ? 'Eneo la kazi' : 'Operations workspace'}</small></span>
      </div>
      <div className="imara-topbar-tools">
        <label className="imara-tool imara-branch">
          <Globe size={15} aria-hidden />
          <select aria-label={t.branch} value={currentBranchId} onChange={(event) => setCurrentBranchId(event.target.value)}>
            <option value="ALL">{t.allBranches}</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <span className={`imara-connection ${isOnline ? 'is-online' : ''}`} title={isOnline ? t.online : t.offlineMode}>
          {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
          <span className="hidden lg:inline">{isOnline ? t.online : t.offlineMode}</span>
        </span>
        {pending > 0 && (
          <button className="imara-tool" type="button" onClick={() => void syncOfflineQueue().catch((error) => showToast('error', t.sync, error.message))} aria-label={t.sync}>
            <RefreshCw size={15} /> {pending}
          </button>
        )}
        <button className="imara-tool" type="button" onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}>
          <Languages size={15} aria-hidden /> {language === 'en' ? 'SW' : 'EN'}
        </button>
        <button className="imara-tool" type="button" onClick={logout} aria-label={t.signOut} title={t.signOut}>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
