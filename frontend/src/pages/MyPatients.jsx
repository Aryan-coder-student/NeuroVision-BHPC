import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../context/auth-context';
import { fetchMyPatients } from '../services/api';
import { formatIndiaDate } from '../utils/date-time';
import './MyPatients.css';

const PAGE_SIZE = 25;

function positivePage(value) {
  const page = Number.parseInt(value || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export default function MyPatients() {
  const { user, workspaces, selectOrg, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const committedSearch = searchParams.get('q') || '';
  const workspaceId = searchParams.get('workspace') || '';
  const page = positivePage(searchParams.get('page'));
  const [searchInput, setSearchInput] = useState(committedSearch);
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [openingPatientId, setOpeningPatientId] = useState('');
  const [openError, setOpenError] = useState('');
  const searchRef = useRef(null);

  const updateParams = useCallback((updates) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, String(value));
        else next.delete(key);
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'My Patients · NeuroVision';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    setSearchInput(committedSearch);
  }, [committedSearch]);

  useEffect(() => {
    if (searchInput === committedSearch) return undefined;
    const timeout = window.setTimeout(() => {
      updateParams({ q: searchInput.trim(), page: '' });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [committedSearch, searchInput, updateParams]);

  const loadPatients = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await fetchMyPatients({
        workspaceId,
        search: committedSearch,
        page,
        pageSize: PAGE_SIZE,
        signal,
      });
      setPatients(result.results || []);
      setTotal(result.count || 0);
      setHasNext(Boolean(result.next));
      setHasPrevious(Boolean(result.previous));
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setLoadError('Patients could not be loaded. Check your connection and try again.');
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [committedSearch, page, workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    loadPatients(controller.signal);
    return () => controller.abort();
  }, [loadPatients]);

  const clearSearch = () => {
    setSearchInput('');
    updateParams({ q: '', page: '' });
    searchRef.current?.focus();
  };

  const openPatient = async (patient) => {
    if (openingPatientId) return;
    setOpeningPatientId(patient.id);
    setOpenError('');
    const workspace = workspaces.find(item => String(item.id) === String(patient.workspace.id));
    if (!workspace) {
      setOpenError('Your access to this patient workspace is no longer active.');
      setOpeningPatientId('');
      return;
    }
    try {
      await selectOrg(workspace);
      navigate(`/patients/${patient.id}/dashboard`);
    } catch {
      setOpenError('The patient workspace could not be opened. Refresh your access and try again.');
      setOpeningPatientId('');
    }
  };

  const firstVisible = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(page * PAGE_SIZE, total);
  const hasFilters = Boolean(workspaceId || committedSearch);

  return (
    <main className="my-patients-page">
      <header className="my-patients-topbar">
        <Link className="my-patients-brand" to="/select-org">
          <span className="my-patients-brand-mark" aria-hidden="true">NV</span>
          <span>NeuroVision</span>
        </Link>
        <nav className="my-patients-nav" aria-label="Account navigation">
          <Link to="/select-org"><Building2 size={14} aria-hidden="true" /> Workspaces</Link>
          <button type="button" onClick={async () => { await logout(); navigate('/login'); }}>
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </nav>
      </header>

      <section className="my-patients-content" aria-labelledby="my-patients-title">
        <div className="my-patients-heading">
          <div>
            <div className="my-patients-eyebrow">Clinical directory · {user?.name}</div>
            <h1 id="my-patients-title">My Patients</h1>
            <p>Patients from every workspace you can currently access.</p>
          </div>
          <div className="my-patients-total" aria-label={`${total} accessible patient records`}>
            <Users size={17} aria-hidden="true" />
            <strong>{total}</strong>
            <span>accessible</span>
          </div>
        </div>

        <div className="my-patients-toolbar" aria-label="Patient filters">
          <div className="my-patients-search">
            <Search size={15} aria-hidden="true" />
            <label className="sr-only" htmlFor="my-patients-search">Search patients</label>
            <input
              ref={searchRef}
              id="my-patients-search"
              type="search"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Search patient name or ID"
              autoComplete="off"
            />
            {searchInput && (
              <button type="button" onClick={clearSearch} aria-label="Clear patient search">
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="my-patients-workspace-filter">
            <label htmlFor="my-patients-workspace">Workspace</label>
            <select
              id="my-patients-workspace"
              value={workspaceId}
              onChange={event => updateParams({ workspace: event.target.value, page: '' })}
            >
              <option value="">All workspaces</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="my-patients-refresh"
            onClick={() => loadPatients()}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {openError && <div className="my-patients-alert" role="alert">{openError}</div>}

        <div className="my-patients-panel">
          {loadError && (
            <div className="my-patients-state my-patients-error" role="alert">
              <p>{loadError}</p>
              <button type="button" onClick={() => loadPatients()}>Try again</button>
            </div>
          )}

          {!loadError && isLoading && (
            <div className="my-patients-state" role="status">
              <Loader2 size={20} className="spin" aria-hidden="true" />
              Loading patients across your workspaces…
            </div>
          )}

          {!loadError && !isLoading && patients.length === 0 && (
            <div className="my-patients-state my-patients-empty">
              <Users size={24} aria-hidden="true" />
              <h2>{hasFilters ? 'No matching patients' : 'No accessible patients'}</h2>
              <p>{hasFilters ? 'Clear the search or choose another workspace.' : 'Patients registered inside your workspaces will appear here.'}</p>
              {hasFilters && <button type="button" onClick={() => { setSearchInput(''); setSearchParams({}, { replace: true }); }}>Clear filters</button>}
            </div>
          )}

          {!loadError && !isLoading && patients.length > 0 && (
            <div className="my-patients-table-wrap">
              <table className="my-patients-table">
                <thead>
                  <tr>
                    <th scope="col">Patient ID</th>
                    <th scope="col">Patient</th>
                    <th scope="col">Workspace</th>
                    <th scope="col">Registered</th>
                    <th scope="col"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(patient => (
                    <tr key={`${patient.workspace.id}:${patient.id}`}>
                      <td><code>{patient.patient_code}</code></td>
                      <td className="my-patients-name">{patient.display_name}</td>
                      <td>
                        <span className="my-patients-workspace-name">{patient.workspace.name}</span>
                        <span className="my-patients-workspace-type">{patient.workspace.inst_type}</span>
                      </td>
                      <td>{formatIndiaDate(patient.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="my-patients-open"
                          onClick={() => openPatient(patient)}
                          disabled={Boolean(openingPatientId)}
                          aria-busy={openingPatientId === patient.id}
                        >
                          {openingPatientId === patient.id ? <Loader2 size={13} className="spin" aria-hidden="true" /> : <ArrowRight size={13} aria-hidden="true" />}
                          <span>{openingPatientId === patient.id ? 'Opening…' : 'Open'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadError && !isLoading && total > 0 && (
            <footer className="my-patients-pagination">
              <span>Showing {firstVisible}–{lastVisible} of {total}</span>
              <div>
                <button type="button" disabled={!hasPrevious} onClick={() => updateParams({ page: page - 1 })}>
                  <ArrowLeft size={13} aria-hidden="true" /> Previous
                </button>
                <button type="button" disabled={!hasNext} onClick={() => updateParams({ page: page + 1 })}>
                  Next <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </footer>
          )}
        </div>
      </section>
    </main>
  );
}
