import { useState, useRef, useEffect } from 'react';
import {
  Loader2, AlertCircle, X, Save, Lock, Timer, CalendarClock,
  Star, Info, AlertTriangle, User, MessageSquare, ZoomIn, Paperclip, MapPin,
  History, ClipboardList,
} from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import { cannedResponseService } from '@/services/cannedResponseService';
import type { TicketDetailDto, CommentType, TicketActivityDto, CannedResponseDto } from '@/types/ticket.types';
import type { UserSystemDto } from '@/types/auth.types';
import {
  TICKET_TYPES, NEXT_STATUS, STATUS_LABELS,
  fmtMinutes, priorityBadge, statusBadge, commentTypeBadge,
} from './ticketHelpers';
import { extractApiError } from '@/utils/apiError';
import { SlaProgressBar } from './SlaProgressBar';
import { TicketAttachmentsTab } from './TicketAttachmentsTab';
import { WorkLogTimer } from './WorkLogTimer';

interface Props {
  ticket:      TicketDetailDto;
  technicians: UserSystemDto[];
  isAdmin:     boolean;
  onClose:     () => void;
  onRefresh:   () => void;
}

export function TicketDetailModal({ ticket, technicians, isAdmin, onClose, onRefresh }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { dialogRef.current?.focus(); }, []);
  const [detail, setDetail] = useState<TicketDetailDto>(ticket);
  const [saving, setSaving]   = useState(false);
  const [errMsg, setErrMsg]   = useState('');
  const [warnMsg, setWarnMsg] = useState(ticket.WhatsAppWarning ?? '');
  const [tab, setTab]         = useState<'info' | 'comments' | 'worklogs' | 'visits' | 'attachments' | 'history'>('info');

  const [commentType, setCommentType] = useState<CommentType>('NotaInterna');
  const [commentBody, setCommentBody] = useState('');
  const [wlHours, setWlHours]   = useState('0');
  const [wlMins,  setWlMins]    = useState('30');
  const [wlNotes, setWlNotes]   = useState('');
  const [visitDate, setVisitDate]   = useState('');
  const [visitTech, setVisitTech]   = useState('');
  const [visitObs,  setVisitObs]    = useState('');
  const [resolveMsg, setResolveMsg] = useState('');
  const [csatScore, setCsatScore] = useState(0);
  const [lightbox, setLightbox]   = useState(false);

  // M11 — activity log
  const [activity,      setActivity]      = useState<TicketActivityDto[]>([]);
  const [activityLoaded, setActivityLoaded] = useState(false);

  // M13 — canned responses
  const [cannedResponses, setCannedResponses] = useState<CannedResponseDto[]>([]);
  const [showCanned,      setShowCanned]      = useState(false);

  const nexts   = NEXT_STATUS[detail.Status] ?? [];
  const tecnico = technicians.find(t => t.Id === detail.AssignedToUserId);

  // Load activity lazily when tab is opened (M11)
  useEffect(() => {
    if (tab === 'history' && !activityLoaded) {
      ticketService.getActivity(detail.Id).then(data => {
        setActivity(data);
        setActivityLoaded(true);
      }).catch(() => { /* show empty */ });
    }
  }, [tab, activityLoaded, detail.Id]);

  // Load canned responses when comment tab opens (M13)
  useEffect(() => {
    if (tab === 'comments' && cannedResponses.length === 0) {
      cannedResponseService.getAll().then(setCannedResponses).catch(() => { /* silent */ });
    }
  }, [tab, cannedResponses.length]);

  const reload = async () => {
    try { setDetail(await ticketService.getById(detail.Id)); }
    catch { /* ignora — el estado previo se mantiene */ }
  };

  const handleStatus = async (newStatus: string) => {
    if (newStatus === 'Resuelto' && !resolveMsg.trim()) {
      setErrMsg('Ingresa un mensaje de resolución antes de marcar como resuelto.');
      return;
    }
    setSaving(true); setErrMsg(''); setWarnMsg('');
    try {
      const updated = await ticketService.changeStatus(detail.Id, {
        Status: newStatus,
        ResolutionMessage: newStatus === 'Resuelto' ? resolveMsg.trim() : undefined,
      });
      setDetail(updated);
      setWarnMsg(updated.WhatsAppWarning ?? '');
      onRefresh();
    } catch (e: unknown) {
      setErrMsg(extractApiError(e, 'Error al cambiar estado.'));
    } finally { setSaving(false); }
  };

  const handleClose = async () => {
    setSaving(true); setErrMsg('');
    try {
      const updated = await ticketService.close(detail.Id);
      setDetail(updated); onRefresh();
    } catch (e: unknown) {
      setErrMsg(extractApiError(e, 'Error al cerrar.'));
    } finally { setSaving(false); }
  };

  const handleAssign = async (techId: string) => {
    setSaving(true); setErrMsg(''); setWarnMsg('');
    try {
      const updated = await ticketService.assign(detail.Id, { TechnicianId: techId });
      setDetail(updated);
      setWarnMsg(updated.WhatsAppWarning ?? '');
      onRefresh();
    } catch (e: unknown) {
      setErrMsg(extractApiError(e, 'Error al asignar.'));
    } finally { setSaving(false); }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    setSaving(true); setErrMsg('');
    try {
      await ticketService.addComment(detail.Id, { Type: commentType, Body: commentBody.trim() });
      setCommentBody('');
      await reload();
    } catch (e: unknown) {
      setErrMsg(extractApiError(e, 'Error al guardar comentario.'));
    } finally { setSaving(false); }
  };

  const handleAddWorkLog = async () => {
    setSaving(true); setErrMsg('');
    try {
      await ticketService.addWorkLog(detail.Id, {
        Hours: parseInt(wlHours) || 0,
        Minutes: parseInt(wlMins) || 0,
        Notes: wlNotes.trim() || undefined,
      });
      setWlHours('0'); setWlMins('30'); setWlNotes('');
      await reload();
    } catch (e: unknown) {
      setErrMsg(extractApiError(e, 'Error al registrar tiempo.'));
    } finally { setSaving(false); }
  };

  const handleScheduleVisit = async () => {
    if (!visitDate) { setErrMsg('Selecciona fecha y hora de la visita.'); return; }
    setSaving(true); setErrMsg('');
    try {
      await ticketService.scheduleVisit(detail.Id, {
        ScheduledAt: new Date(visitDate).toISOString(),
        TechnicianId: visitTech || undefined,
        Observations: visitObs.trim() || undefined,
      });
      setVisitDate(''); setVisitTech(''); setVisitObs('');
      await reload();
    } catch (e: unknown) {
      setErrMsg(extractApiError(e, 'Error al programar visita.'));
    } finally { setSaving(false); }
  };

  const handleCsat = async (score: number) => {
    setSaving(true); setErrMsg('');
    try {
      const updated = await ticketService.submitCsat(detail.Id, { Score: score });
      setDetail(updated); setCsatScore(score);
    } catch (e: unknown) {
      setErrMsg(extractApiError(e, 'Error al guardar CSAT.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="ticket-detail-modal-title" tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col outline-none">

        <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {statusBadge(detail.Status)}
              {priorityBadge(detail.Priority)}
              {detail.SupportGroup && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {detail.SupportGroup}
                </span>
              )}
            </div>
            <h2 id="ticket-detail-modal-title" className="text-base font-bold text-gray-900 leading-tight">{detail.Subject}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {detail.ClientName} · {detail.ClientTbn}
              {detail.TicketNumber && (
                <span className="ml-2 font-mono text-gray-500">{detail.TicketNumber}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 shrink-0 overflow-x-auto">
          {([
            { key: 'info',        label: 'Información',                        icon: Info },
            { key: 'comments',    label: `Notas (${detail.Comments.length})`,  icon: MessageSquare },
            { key: 'worklogs',    label: `Tiempo (${detail.WorkLogs.length})`, icon: Timer },
            { key: 'visits',      label: `Visitas (${detail.Visits.length})`,  icon: CalendarClock },
            { key: 'attachments', label: 'Adjuntos',                           icon: Paperclip },
            { key: 'history',     label: 'Historial',                          icon: History },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${tab === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === 'info' && (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detail.Description}</p>
              </div>

              {detail.ImageUrl && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Imagen del cliente</p>
                  <div
                    className="relative inline-block group cursor-zoom-in"
                    onClick={() => setLightbox(true)}
                  >
                    <img
                      src={detail.ImageUrl}
                      alt="Imagen técnica enviada por el cliente"
                      className="rounded-lg border border-gray-200 max-h-52 object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Tipo', TICKET_TYPES[detail.Type] ?? detail.Type],
                  ['Origen', detail.Origin],
                  ['Creado por', detail.CreatedByName],
                  ['Creado el', new Date(detail.CreatedAt).toLocaleString('es-BO')],
                  detail.DueDate ? ['Vence el', new Date(detail.DueDate).toLocaleString('es-BO')] : null,
                  detail.FirstRespondedAt ? ['1ª respuesta', new Date(detail.FirstRespondedAt).toLocaleString('es-BO')] : null,
                  detail.ResolvedAt ? ['Resuelto el', new Date(detail.ResolvedAt).toLocaleString('es-BO')] : null,
                  detail.ClosedAt ? ['Cerrado el', new Date(detail.ClosedAt).toLocaleString('es-BO')] : null,
                  detail.TotalWorkMinutes > 0 ? ['Tiempo trabajado', fmtMinutes(detail.TotalWorkMinutes)] : null,
                ].filter((row): row is string[] => row !== null).map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-gray-400">{label as string}</p>
                    <p className="font-medium text-gray-700">{value as string}</p>
                  </div>
                ))}
                {detail.SlaCompliant !== null && (
                  <div>
                    <p className="text-xs text-gray-400">SLA</p>
                    <p className={`font-semibold text-sm ${detail.SlaCompliant ? 'text-green-600' : 'text-red-500'}`}>
                      {detail.SlaCompliant ? '✓ Cumplido' : '✗ Incumplido'}
                    </p>
                  </div>
                )}
              </div>

              {/* Barra de progreso SLA en tiempo real (M03) */}
              {(detail.SlaDeadline || detail.SlaCompliant !== null) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">SLA</p>
                  <SlaProgressBar
                    slaDeadline={detail.SlaDeadline}
                    slaPausedAt={detail.SlaPausedAt ?? null}
                    slaTotalPausedMinutes={detail.SlaTotalPausedMinutes}
                    status={detail.Status}
                    slaCompliant={detail.SlaCompliant}
                    createdAt={detail.CreatedAt}
                  />
                </div>
              )}

              {detail.ResolutionMessage && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Resolución</p>
                  <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3">{detail.ResolutionMessage}</p>
                </div>
              )}

              {detail.RootCause && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Causa raíz</p>
                  <p className="text-sm text-gray-700 bg-purple-50 border border-purple-100 rounded-lg p-3">{detail.RootCause}</p>
                </div>
              )}

              {isAdmin && detail.Status !== 'Cerrado' && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Técnico asignado</p>
                  <select className="input-field" value={detail.AssignedToUserId ?? ''}
                    onChange={e => { if (e.target.value) handleAssign(e.target.value); }} disabled={saving}>
                    <option value="">— Sin asignar —</option>
                    {technicians.map(t => (
                      <option key={t.Id} value={t.Id}>{t.FullName} ({t.Role})</option>
                    ))}
                  </select>
                  {tecnico && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><User className="w-3 h-3" />Actual: {tecnico.FullName}</p>}
                </div>
              )}
              {!isAdmin && detail.AssignedToName && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Técnico asignado</p>
                  <p className="text-sm text-gray-700 flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" />{detail.AssignedToName}</p>
                </div>
              )}

              {nexts.includes('Resuelto') && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Mensaje de resolución *</p>
                  <textarea className="input-field resize-none" rows={3} maxLength={2000}
                    placeholder="Describe la solución aplicada al cliente..."
                    value={resolveMsg} onChange={e => setResolveMsg(e.target.value)} />
                  <p className="text-xs text-gray-400 text-right">{resolveMsg.length}/2000</p>
                </div>
              )}

              {(detail.Status === 'Resuelto' || detail.Status === 'Cerrado') && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Satisfacción del cliente (CSAT)</p>
                  {detail.CsatScore ? (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-5 h-5 ${n <= detail.CsatScore! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                      <span className="text-sm text-gray-500 ml-1">{detail.CsatScore}/5</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => handleCsat(n)} disabled={saving}
                          className="hover:scale-110 transition-transform">
                          <Star className={`w-6 h-6 ${n <= csatScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}
                            onMouseEnter={() => setCsatScore(n)} onMouseLeave={() => setCsatScore(0)} />
                        </button>
                      ))}
                      <span className="text-xs text-gray-400 ml-1">Sin puntaje aún</span>
                    </div>
                  )}
                </div>
              )}

              {warnMsg && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-yellow-800">{warnMsg}</p>
                </div>
              )}

              {errMsg && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" />{errMsg}</p>}

              {nexts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {nexts.map(ns => (
                    <button key={ns}
                      onClick={() => ns === 'Cerrado' ? handleClose() : handleStatus(ns)}
                      disabled={saving}
                      className={ns === 'Cerrado' ? 'btn-danger' : 'btn-primary'}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {STATUS_LABELS[ns] ?? ns}
                    </button>
                  ))}
                </div>
              )}

              {detail.Status === 'Cerrado' && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">Ticket cerrado. Solo lectura.</p>
                </div>
              )}
            </>
          )}

          {tab === 'comments' && (
            <>
              {detail.Comments.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Sin notas aún.</p>
                : (
                  <div className="space-y-3">
                    {detail.Comments.map(c => (
                      <div key={c.Id} className={`rounded-lg p-3 border text-sm
                        ${c.Type === 'RespuestaCliente' ? 'bg-blue-50 border-blue-100' :
                          c.Type === 'CausaRaiz' ? 'bg-purple-50 border-purple-100' :
                          'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          {commentTypeBadge(c.Type)}
                          <span className="text-xs text-gray-500">{c.AuthorName} · {new Date(c.CreatedAt).toLocaleString('es-BO')}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{c.Body}</p>
                      </div>
                    ))}
                  </div>
                )}

              {detail.Status !== 'Cerrado' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agregar nota / respuesta</p>
                  <div className="flex gap-2">
                    {(['NotaInterna', 'RespuestaCliente', 'CausaRaiz'] as CommentType[]).map(t => (
                      <button key={t} onClick={() => setCommentType(t)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                          ${commentType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {t === 'NotaInterna' ? 'Nota interna' : t === 'RespuestaCliente' ? 'Respuesta cliente' : 'Causa raíz'}
                      </button>
                    ))}
                  </div>
                  {cannedResponses.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCanned(v => !v)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        <ClipboardList className="w-3.5 h-3.5" /> Usar plantilla
                      </button>
                      {showCanned && (
                        <div className="absolute z-10 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                          {cannedResponses.map(cr => (
                            <button
                              key={cr.Id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                              onClick={() => { setCommentBody(cr.Body); setShowCanned(false); }}
                            >
                              <p className="text-sm font-medium text-gray-800">{cr.Title}</p>
                              {cr.Category && <p className="text-xs text-gray-400">{cr.Category}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <textarea className="input-field resize-none" rows={4} maxLength={4000}
                    placeholder={commentType === 'RespuestaCliente'
                      ? 'Escribe la respuesta visible para el cliente...'
                      : commentType === 'CausaRaiz'
                      ? 'Documenta la causa raíz del problema...'
                      : 'Nota interna del equipo de soporte...'}
                    value={commentBody} onChange={e => setCommentBody(e.target.value)} />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">{commentBody.length}/4000</p>
                    <button className="btn-primary" onClick={handleAddComment} disabled={saving || !commentBody.trim()}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar
                    </button>
                  </div>
                  {errMsg && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{errMsg}</p>}
                </div>
              )}
            </>
          )}

          {tab === 'worklogs' && (
            <>
              {detail.WorkLogs.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Sin registros de tiempo.</p>
                : (
                  <div className="space-y-2">
                    <div className="text-right text-sm font-semibold text-gray-700">
                      Total: {fmtMinutes(detail.TotalWorkMinutes)}
                    </div>
                    {detail.WorkLogs.map(w => (
                      <div key={w.Id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="w-14 text-center bg-blue-100 text-blue-700 rounded-lg py-1 text-sm font-bold shrink-0">
                          {fmtMinutes(w.TotalMinutes)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">{w.UserName}</p>
                          {w.Notes && <p className="text-xs text-gray-500 truncate">{w.Notes}</p>}
                        </div>
                        <p className="text-xs text-gray-400 shrink-0">{new Date(w.LoggedAt).toLocaleString('es-BO')}</p>
                      </div>
                    ))}
                  </div>
                )}

              {detail.Status !== 'Cerrado' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Registrar tiempo</p>
                  <WorkLogTimer onStop={(h, m) => { setWlHours(String(h)); setWlMins(String(m)); }} />
                  <div className="flex gap-3 items-end">
                    <div>
                      <label className="label">Horas</label>
                      <input type="number" min={0} max={24} className="input-field w-20"
                        value={wlHours} onChange={e => setWlHours(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Minutos</label>
                      <input type="number" min={0} max={59} className="input-field w-20"
                        value={wlMins} onChange={e => setWlMins(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className="label">Notas (opcional)</label>
                      <input type="text" className="input-field" placeholder="Qué hiciste..."
                        value={wlNotes} onChange={e => setWlNotes(e.target.value)} />
                    </div>
                    <button className="btn-primary shrink-0" onClick={handleAddWorkLog} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar
                    </button>
                  </div>
                  {errMsg && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{errMsg}</p>}
                </div>
              )}
            </>
          )}

          {tab === 'attachments' && (
            <TicketAttachmentsTab ticketId={detail.Id} isReadOnly={detail.Status === 'Cerrado'} />
          )}

          {tab === 'history' && (
            <>
              {!activityLoaded
                ? <p className="text-sm text-gray-400 text-center py-8 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Cargando historial...</p>
                : activity.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Sin actividad registrada para este ticket.</p>
                : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                    <div className="space-y-3 pl-10">
                      {activity.map(a => (
                        <div key={a.Id} className="relative">
                          <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-200 border-2 border-white ring-1 ring-blue-300" />
                          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                {a.Action}
                              </span>
                              <span className="text-xs text-gray-400">{a.UserName}</span>
                              <span className="text-xs text-gray-300 ml-auto">
                                {new Date(a.Timestamp).toLocaleString('es-BO')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{a.Description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}

          {tab === 'visits' && (
            <>
              {detail.Visits.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Sin visitas programadas.</p>
                : (
                  <div className="space-y-3">
                    {detail.Visits.map(v => {
                      const visitStatusCls: Record<string, string> = {
                        Programada:  'bg-indigo-100 text-indigo-700',
                        Completada:  'bg-green-100 text-green-700',
                        Cancelada:   'bg-red-100 text-red-600',
                      };
                      const gpsUrl = detail.ClientGpsLatitude && detail.ClientGpsLongitude
                        ? `https://www.google.com/maps?q=${detail.ClientGpsLatitude},${detail.ClientGpsLongitude}`
                        : null;
                      return (
                        <div key={v.Id} className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <CalendarClock className="w-4 h-4 text-indigo-500" />
                              <span className="font-semibold text-indigo-800">{new Date(v.ScheduledAt).toLocaleString('es-BO')}</span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${visitStatusCls[v.Status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {v.Status}
                            </span>
                          </div>
                          {v.TechnicianName && (
                            <p className="text-xs text-gray-600 flex items-center gap-1"><User className="w-3 h-3" />{v.TechnicianName}</p>
                          )}
                          {v.Observations && <p className="text-xs text-gray-500 mt-1">{v.Observations}</p>}
                          {gpsUrl && (
                            <a
                              href={gpsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-1.5"
                            >
                              <MapPin className="w-3 h-3" />
                              Ver ubicación en Google Maps
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              {detail.Status !== 'Cerrado' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Programar visita técnica</p>
                  <div>
                    <label className="label">Fecha y hora *</label>
                    <input type="datetime-local" className="input-field"
                      value={visitDate} onChange={e => setVisitDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Técnico (si difiere del gestor)</label>
                    <select className="input-field" value={visitTech} onChange={e => setVisitTech(e.target.value)}>
                      <option value="">— Mismo del ticket —</option>
                      {technicians.map(t => <option key={t.Id} value={t.Id}>{t.FullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Observaciones (equipos, acceso, contacto)</label>
                    <textarea className="input-field resize-none" rows={3} maxLength={1000}
                      placeholder="Equipos a llevar, datos de acceso, contacto en sitio..."
                      value={visitObs} onChange={e => setVisitObs(e.target.value)} />
                  </div>
                  <div className="flex justify-end">
                    <button className="btn-primary" onClick={handleScheduleVisit} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                      Programar visita
                    </button>
                  </div>
                  {errMsg && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{errMsg}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {lightbox && detail.ImageUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightbox(false)}
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={detail.ImageUrl}
            alt="Imagen técnica del cliente (ampliada)"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
