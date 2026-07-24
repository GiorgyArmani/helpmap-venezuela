"use client";

// The staff/admin overlay (login → tabbed panel → edit forms). Extracted verbatim from
// HelpMap.tsx to shrink the monolith (CLAUDE.md §14); all state/handlers arrive through
// the AdminContext so the JSX is unchanged. Rendered only while view === "admin".

import { useAdmin } from "./AdminContext";
import { ICON } from "./icons";
import { AYUDA_META, AYUDA_ORDER, ESTADO_META, ESTADO_ORDER, SM, STATE_LABEL, TYPE_META } from "./data";
import type { LocationType, VzlaState } from "./data";
import { AUDIT_LABEL, VOL_PROFILES } from "./constants";
import { timeAgo, localeOf } from "./helpers";

export default function AdminPanel() {
  const {
    pickingOnMap, setPickingOnMap, user, signOut, openStaffTour, setView, clearEdit, t, lang,
    recoverMode, setRecoverMode, sendRecovery, recoverSent, setRecoverSent,
    loginEmail, setLoginEmail, loginBusy, loginErr, setLoginErr, signIn, loginPass, setLoginPass,
    editType, adminTab, switchTab, isAdmin, isVolunteer,
    loadAudit, loadContributions, loadVolRequests, loadVolunteers, loadReports, loadRescAdmin,
    maintenance, toggleMaintenance, maintBusy,
    contribs, reports, volReqs, audit,
    admSearchBar, admHit, admQ,
    newCenter, locations, patients, editCenter, deleteCenter,
    newDonation, donations, editDonation, deleteDonation,
    newPerson, editPerson, deletePerson,
    newRescatado, rescAdmin, startPromote, editRescatado, deleteRescatado,
    reviewReport,
    listLoc, setListLoc, listDate, setListDate, todayISO, listNote, setListNote,
    onPickList, listBusy, listProgress, listResult,
    reviewVolRequest, volEmail, setVolEmail, volPass, setVolPass, genPass, createVolunteer, volBusy, volunteers, revokeVolunteer,
    draft, setD, setDV, setDraft, geoQuery, setGeoQuery, geoBusy, geocodeAddress, geoResults, pickGeoResult,
    saveCenter, saveDonation, savePerson, saveRescatado, savePromotion, reviewContribution,
    statusOpts, canDelete, editId,
  } = useAdmin();

  return (
        <div className={"overlay" + (pickingOnMap ? " overlay-pick" : "")}>
          <div className="ovhead">
            <button
              className="oicon"
              onClick={() => {
                setView(null);
                clearEdit();
              }}
            >
              {ICON.back}
            </button>
            <span className="ohtitle">{t.adminTitle}</span>
            {user && (
              <button className="staff-guide" onClick={openStaffTour} aria-label={t.staffGuide} title={t.staffGuide}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5" />
                  <path d="M12 17.5h.01" />
                </svg>
              </button>
            )}
            {user && (
              <button className="signout" onClick={signOut}>
                {t.signOut}
              </button>
            )}
          </div>

          {!user ? (
            <div className="loginwrap">
              {recoverMode ? (
                <form className="form" onSubmit={sendRecovery}>
                  <p className="recintro">{t.recoverHint}</p>
                  {recoverSent ? (
                    <div className="lok">{t.recoverSent}</div>
                  ) : (
                    <>
                      <div className="fld">
                        <span className="flabel">{t.email}</span>
                        <input
                          className="finput"
                          type="email"
                          autoComplete="username"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="tucorreo@helpmapvzla.net"
                        />
                      </div>
                      <button className="btnp" type="submit" disabled={loginBusy || !loginEmail}>
                        {loginBusy ? "…" : t.sendLink}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => {
                      setRecoverMode(false);
                      setRecoverSent(false);
                      setLoginErr("");
                    }}
                  >
                    {t.backToLogin}
                  </button>
                </form>
              ) : (
                <>
                  <form className="form" onSubmit={signIn}>
                    <div className="fld">
                      <span className="flabel">{t.email}</span>
                      <input
                        className="finput"
                        type="email"
                        autoComplete="username"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin@helpmapvzla.net"
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.password}</span>
                      <input
                        className="finput"
                        type="password"
                        autoComplete="current-password"
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    {loginErr && <span className="lerr">{loginErr}</span>}
                    <button className="btnp" type="submit" disabled={loginBusy}>
                      {loginBusy ? "…" : t.signIn}
                    </button>
                    <button
                      type="button"
                      className="linkbtn"
                      onClick={() => {
                        setRecoverMode(true);
                        setLoginErr("");
                      }}
                    >
                      {t.forgotPass}
                    </button>
                  </form>
                  <div className="loginhint">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="9" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    {t.loginHint}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {!editType && (
                <div className="admtabs">
                  <button
                    className={"atab " + (adminTab === "novedades" ? "atab-on" : "")}
                    onClick={() => {
                      switchTab("novedades");
                      loadAudit();
                      loadContributions();
                      if (isAdmin) loadVolRequests();
                    }}
                  >
                    {t.tabNews}
                    {contribs.length + volReqs.length + reports.length > 0 && (
                      <span className="atab-badge">{contribs.length + volReqs.length + reports.length}</span>
                    )}
                  </button>
                  <button
                    className={"atab " + (adminTab === "centros" ? "atab-on" : "")}
                    onClick={() => switchTab("centros")}
                  >
                    {t.tabCenters}
                  </button>
                  <button
                    className={"atab " + (adminTab === "personas" ? "atab-on" : "")}
                    onClick={() => switchTab("personas")}
                  >
                    {t.tabPeople}
                  </button>
                  <button
                    className={"atab " + (adminTab === "listas" ? "atab-on" : "")}
                    onClick={() => switchTab("listas")}
                  >
                    {t.tabLists}
                  </button>
                  <button
                    className={"atab " + (adminTab === "rescatados" ? "atab-on" : "")}
                    onClick={() => {
                      switchTab("rescatados");
                      loadRescAdmin();
                    }}
                  >
                    {t.tabRescued}
                  </button>
                  <button
                    className={"atab " + (adminTab === "reportes" ? "atab-on" : "")}
                    onClick={() => {
                      switchTab("reportes");
                      loadReports();
                    }}
                  >
                    {t.tabReports}
                    {reports.length > 0 && <span className="atab-badge">{reports.length}</span>}
                  </button>
                  <button
                    className={"atab " + (adminTab === "donaciones" ? "atab-on" : "")}
                    onClick={() => switchTab("donaciones")}
                  >
                    {t.tabDonations}
                  </button>
                  {isAdmin && (
                    <button
                      className={"atab " + (adminTab === "voluntarios" ? "atab-on" : "")}
                      onClick={() => {
                        switchTab("voluntarios");
                        loadVolunteers();
                        loadVolRequests();
                      }}
                    >
                      {t.tabVolunteers}
                    </button>
                  )}
                </div>
              )}
              <div className="ovbody">
                {/* Maintenance toggle — admin only, shown on every tab (high-impact,
                    same gate as deletes). Flips the public site-wide banner. */}
                {isAdmin && !editType && (
                  <div className={"maint-toggle" + (maintenance ? " maint-toggle-on" : "")}>
                    <div className="maint-toggle-txt">
                      <div className="maint-toggle-title">
                        {t.maintTitle}
                        <span className={"maint-pill" + (maintenance ? " maint-pill-on" : "")}>
                          {maintenance ? t.maintActive : t.maintInactive}
                        </span>
                      </div>
                      <div className="maint-toggle-hint">{t.maintHint}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={maintenance}
                      className={"switch" + (maintenance ? " switch-on" : "")}
                      onClick={toggleMaintenance}
                      disabled={maintBusy}
                      aria-label={t.maintTitle}
                    >
                      <span className="switch-knob" />
                    </button>
                  </div>
                )}
                <div className="note" style={{ marginBottom: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                  </svg>
                  {isAdmin ? t.adminLocalNote : t.volReviewNote}
                </div>

                {adminTab === "novedades" && !editType && (
                  <div className="feed">
                    {(contribs.length > 0 || reports.length > 0 || (isAdmin && volReqs.length > 0)) && (
                      <div className="feed-pending">
                        {contribs.length > 0 && (
                          <button className="feed-pill" onClick={() => switchTab("personas")}>
                            {t.newsPendingContribs.replace("{n}", String(contribs.length))}
                          </button>
                        )}
                        {reports.length > 0 && (
                          <button
                            className="feed-pill"
                            onClick={() => {
                              switchTab("reportes");
                              loadReports();
                            }}
                          >
                            {t.newsPendingReports.replace("{n}", String(reports.length))}
                          </button>
                        )}
                        {isAdmin && volReqs.length > 0 && (
                          <button
                            className="feed-pill"
                            onClick={() => {
                              switchTab("voluntarios");
                              loadVolRequests();
                            }}
                          >
                            {t.newsPendingVols.replace("{n}", String(volReqs.length))}
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      className="addbtn"
                      onClick={() => {
                        // Refresh EVERYTHING the panel shows, not just the feed: the
                        // pending-aportes / volunteer-request counts drive the badge and
                        // the pills above, so refreshing only the audit list would leave
                        // them stale (looks like "nothing updated").
                        loadAudit();
                        loadContributions();
                        loadReports();
                        if (isAdmin) loadVolRequests();
                      }}
                    >
                      {t.newsRefresh}
                    </button>
                    {audit.length === 0 ? (
                      <div className="empty">{t.newsEmpty}</div>
                    ) : (
                      <ul className="feed-list">
                        {audit.map((a) => (
                          <li key={a.id} className={"feed-item feed-" + a.entity_type}>
                            <div className="feed-main">
                              <span className="feed-action">{AUDIT_LABEL[a.action]?.[lang] ?? a.action}</span>
                              {a.summary && <span className="feed-sum">{a.summary}</span>}
                            </div>
                            <div className="feed-meta">
                              <span>{a.actor_email ?? (a.action === "contribution_new" || a.action === "volunteer_apply" ? t.newsPublic : t.newsSystem)}</span>
                              <span className="feed-dot">·</span>
                              <span>{timeAgo(a.created_at, lang)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {adminTab === "centros" && !editType && (
                  <div>
                    <button className="addbtn" onClick={newCenter}>
                      {ICON.plus}
                      {t.addCenter}
                    </button>
                    {admSearchBar}
                    {(() => {
                      const rows = locations.filter((l) =>
                        admHit(l.canonical_name + " " + (l.municipality ?? "") + " " + STATE_LABEL[l.state] + " " + TYPE_META[l.type][lang]),
                      );
                      if (rows.length === 0)
                        return <div className="asub" style={{ padding: "8px 2px" }}>{admQ ? t.admSearchNone : t.noResults}</div>;
                      return rows.map((l) => (
                      <div className="arow" key={l.location_id}>
                        <div className="ai">
                          <div className="aname">{l.canonical_name}</div>
                          <div className="asub">
                            {STATE_LABEL[l.state] + " · " + (l.municipality ?? "—") + " · " + TYPE_META[l.type][lang]}
                          </div>
                        </div>
                        <div className="aacts">
                          <span className="acount">
                            {patients.filter((p) => p.location_id === l.location_id).length + " " + t.records}
                          </span>
                          <button className="amini" onClick={() => editCenter(l)}>
                            {ICON.edit}
                          </button>
                          {isAdmin && (
                            <button className="amini del" onClick={() => deleteCenter(l.location_id)}>
                              {ICON.trash}
                            </button>
                          )}
                        </div>
                      </div>
                      ));
                    })()}
                  </div>
                )}

                {adminTab === "donaciones" && !editType && (
                  <div>
                    <button className="addbtn" onClick={newDonation}>
                      {ICON.plus}
                      {t.addDonation}
                    </button>
                    {admSearchBar}
                    {donations.length === 0 && <div className="asub" style={{ padding: "8px 2px" }}>{t.donNone}</div>}
                    {donations
                      .filter((d) => admHit(d.name + " " + (d.description ?? "")))
                      .map((d) => (
                      <div className="arow" key={d.id}>
                        <div className="ai">
                          <div className="aname">{d.name}</div>
                          {d.description && <div className="asub">{d.description}</div>}
                        </div>
                        <div className="aacts">
                          <button className="amini" onClick={() => editDonation(d)}>
                            {ICON.edit}
                          </button>
                          {isAdmin && (
                            <button className="amini del" onClick={() => deleteDonation(d.id)}>
                              {ICON.trash}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === "personas" && !editType && (
                  <div>
                    <button className="addbtn" onClick={newPerson}>
                      {ICON.plus}
                      {t.addPerson}
                    </button>
                    {admSearchBar}
                    {patients.filter((p) => admHit(p.nombres + " " + p.apellidos + " " + p.ci_display + " " + p.location_name)).length === 0 && (
                      <div className="asub" style={{ padding: "8px 2px" }}>{admQ ? t.admSearchNone : t.noResults}</div>
                    )}
                    {patients
                      .filter((p) => admHit(p.nombres + " " + p.apellidos + " " + p.ci_display + " " + p.location_name))
                      .map((p) => {
                      const nAportes = contribs.filter((c) => c.patient_id === p.id).length;
                      return (
                      <div className={"arow " + SM[p.estatus].cls} key={p.id}>
                        <div className="ai">
                          <div className="aname">{p.nombres + " " + p.apellidos}</div>
                          <div className="asub">{p.location_name}</div>
                        </div>
                        <div className="aacts">
                          {nAportes > 0 && (
                            <span className="abadge" style={{ background: "#fde68a", color: "#92400e" }} title={t.tabContribs}>
                              {nAportes} ⬆
                            </span>
                          )}
                          <span className="abadge">{SM[p.estatus][lang]}</span>
                          <button className="amini" onClick={() => editPerson(p)}>
                            {ICON.edit}
                          </button>
                          {isAdmin && (
                            <button className="amini del" onClick={() => deletePerson(p.id)}>
                              {ICON.trash}
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {adminTab === "rescatados" && !editType && (
                  <div>
                    <div className="note" style={{ marginBottom: 12 }}>
                      <span className="resc-ic">{ICON.rescue}</span>
                      {t.rescuedReviewNote}
                    </div>
                    <button className="addbtn" onClick={newRescatado}>
                      {ICON.plus}
                      {t.addRescued}
                    </button>
                    {admSearchBar}
                    {rescAdmin.filter((r) => admHit(r.nombres + " " + r.apellidos + " " + (r.ci ?? "") + " " + (r.rescue_site ?? ""))).length === 0 && (
                      <div className="asub" style={{ padding: "8px 2px" }}>{admQ ? t.admSearchNone : t.rescuedNone}</div>
                    )}
                    {rescAdmin
                      .filter((r) => admHit(r.nombres + " " + r.apellidos + " " + (r.ci ?? "") + " " + (r.rescue_site ?? "")))
                      .map((r) => (
                      <div className="arow st-resc" key={r.id}>
                        <div className="ai">
                          <div className="aname">{(r.nombres + " " + r.apellidos).trim() || "—"}</div>
                          <div className="asub">
                            {[
                              r.edad != null ? r.edad + " " + t.yrs : null,
                              r.sexo === "M" ? t.male : r.sexo === "F" ? t.female : null,
                              r.rescue_site,
                            ]
                              .filter(Boolean)
                              .join(" · ") || t.rescuedStatus}
                          </div>
                        </div>
                        <div className="aacts">
                          <button className="amini resc-promote" title={t.promote} onClick={() => startPromote(r)}>
                            {ICON.pin}
                          </button>
                          <button className="amini" onClick={() => editRescatado(r)}>
                            {ICON.edit}
                          </button>
                          {isAdmin && (
                            <button className="amini del" onClick={() => deleteRescatado(r.id)}>
                              {ICON.trash}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === "reportes" && !editType && (
                  <div>
                    <div className="note" style={{ marginBottom: 12 }}>
                      <span className="resc-ic">{ICON.search}</span>
                      {t.rmIntro}
                    </div>
                    {reports.length === 0 && (
                      <div className="asub" style={{ padding: "8px 2px" }}>{t.reportsNone}</div>
                    )}
                    {reports.map((r) => (
                      <div className="arow" key={r.id}>
                        <div className="ai">
                          <div className="aname">{(r.nombres + " " + r.apellidos).trim() || "—"}</div>
                          <div className="asub">
                            {[
                              r.ci ? r.ci : null,
                              r.edad != null ? r.edad + " " + t.yrs : null,
                              r.zona ? t.reportZonaLabel + ": " + r.zona : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          {r.descripcion && <div className="asub" style={{ marginTop: 3 }}>{r.descripcion}</div>}
                          <div className="asub" style={{ marginTop: 3 }}>
                            {t.reportReporter}: {r.reporter_name || "—"}
                            {r.reporter_contact ? " · " + r.reporter_contact : ""}
                            {" · " + timeAgo(r.created_at, lang)}
                          </div>
                        </div>
                        <div className="aacts">
                          <button className="amini" title={t.reportMarkReviewed} onClick={() => reviewReport(r.id, "reviewed")}>
                            {ICON.check}
                          </button>
                          <button className="amini del" title={t.reportCloseAction} onClick={() => reviewReport(r.id, "closed")}>
                            {ICON.trash}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === "listas" && !editType && (
                  <div className="form">
                    <div className="note" style={{ marginBottom: 4 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M7 9h10M7 13h10M7 17h6" />
                      </svg>
                      {t.listHint}
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_ubic}</span>
                      <select className="fselect" value={listLoc} onChange={(e) => setListLoc(e.target.value)}>
                        <option value="">{t.selectHosp}</option>
                        {locations.map((l) => (
                          <option key={l.location_id} value={l.location_id}>
                            {l.canonical_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.listDate}</span>
                      <input
                        className="finput"
                        type="date"
                        max={todayISO}
                        value={listDate}
                        onChange={(e) => setListDate(e.target.value)}
                      />
                      <span className="fhint">{t.listDateHint}</span>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.listNote}</span>
                      <input className="finput" value={listNote} onChange={(e) => setListNote(e.target.value)} placeholder={t.listNote} />
                    </div>
                    <label className="upload">
                      <input type="file" accept="image/*" multiple onChange={onPickList} style={{ display: "none" }} disabled={listBusy} />
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 16V4M8 8l4-4 4 4" />
                        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                      </svg>
                      {listBusy
                        ? listProgress && listProgress.total > 1
                          ? `${t.listSending} ${listProgress.done}/${listProgress.total}`
                          : t.listSending
                        : t.listPick}
                    </label>
                    {listBusy && (
                      <div className="list-progress" role="status" aria-live="polite">
                        <span className="spin" />
                        {listProgress && listProgress.total > 1
                          ? `${t.listSending} ${listProgress.done}/${listProgress.total}`
                          : t.listSending}
                      </div>
                    )}
                    {!listBusy && listResult && (
                      <div className={"list-result list-result-" + listResult.kind} role="status" aria-live="polite">
                        {listResult.kind === "ok" ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 8v5M12 16.5v.5" />
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                        )}
                        <span>{listResult.msg}</span>
                      </div>
                    )}
                  </div>
                )}

                {adminTab === "voluntarios" && isAdmin && !editType && (
                  <div className="form">
                    {/* Pending public applications — approve to provision the account. */}
                    <div className="fld">
                      <span className="flabel">{t.volRequests}</span>
                      <span className="fhint">{t.volReqReviewNote}</span>
                      {volReqs.length === 0 && <div className="asub" style={{ padding: "6px 2px" }}>{t.volReqNone}</div>}
                      {volReqs.map((rq) => (
                        <div className="volreq" key={rq.id}>
                          <div className="volreq-head">
                            <span className="volreq-name">{rq.nombre || rq.email}</span>
                            {rq.perfil && (
                              <span className="volreq-badge">
                                {VOL_PROFILES.find((pf) => pf.value === rq.perfil)?.[lang] ?? rq.perfil}
                              </span>
                            )}
                          </div>
                          <div className="volreq-meta">
                            <span>{ICON.mail}{rq.email}</span>
                            {rq.telefono && <span>{ICON.phone}{rq.telefono}</span>}
                            <span className="volreq-date">
                              {new Date(rq.created_at).toLocaleDateString(localeOf(lang))}
                            </span>
                          </div>
                          {rq.fuentes && (
                            <div className="volreq-why">
                              <span className="volreq-why-label">{t.volReqWhy}</span>
                              <p>{rq.fuentes}</p>
                            </div>
                          )}
                          <div className="volreq-acts">
                            <button className="btng volreq-reject" onClick={() => reviewVolRequest(rq.id, "reject")}>
                              {t.volReject}
                            </button>
                            <button className="btnp" onClick={() => reviewVolRequest(rq.id, "approve")}>
                              {ICON.check}
                              {t.volApprove}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="fld" style={{ marginTop: 8 }}>
                      <span className="flabel">{t.email}</span>
                      <input
                        className="finput"
                        type="email"
                        autoComplete="off"
                        value={volEmail}
                        onChange={(e) => setVolEmail(e.target.value)}
                        placeholder="voluntario@correo.com"
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.volPass}</span>
                      <div className="frow" style={{ alignItems: "stretch" }}>
                        <input
                          className="finput mono"
                          value={volPass}
                          onChange={(e) => setVolPass(e.target.value)}
                          placeholder="••••••"
                        />
                        <button type="button" className="btng" style={{ flex: "0 0 auto" }} onClick={genPass}>
                          {t.volGenerate}
                        </button>
                      </div>
                    </div>
                    <button className="btnp" onClick={createVolunteer} disabled={volBusy}>
                      {ICON.plus}
                      {volBusy ? "…" : t.volCreate}
                    </button>

                    <div style={{ marginTop: 16 }}>
                      {volunteers.length === 0 && <div className="empty">{t.volNone}</div>}
                      {volunteers.map((v) => (
                        <div className="arow" key={v.user_id}>
                          <div className="ai">
                            <div className="aname">{v.email}</div>
                            <div className="asub">{t.tabVolunteers}</div>
                          </div>
                          <div className="aacts">
                            <button className="amini del" onClick={() => revokeVolunteer(v.user_id)}>
                              {ICON.trash}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editType === "center" && (
                  <div className="form">
                    <div className="fld">
                      <span className="flabel">{t.f_name}</span>
                      <input className="finput" value={draft?.canonical_name || ""} onChange={setD("canonical_name")} placeholder={t.f_name} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.type}</span>
                      <select className="fselect" value={draft?.type || "hospital"} onChange={setD("type")}>
                        {(Object.keys(TYPE_META) as LocationType[]).map((k) => (
                          <option key={k} value={k}>
                            {TYPE_META[k][lang]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_city}</span>
                      <select className="fselect" value={draft?.state || "distrito_capital"} onChange={setD("state")}>
                        {(Object.keys(STATE_LABEL) as VzlaState[]).map((s) => (
                          <option key={s} value={s}>
                            {STATE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_parish}</span>
                      <input className="finput" value={draft?.municipality || ""} onChange={setD("municipality")} placeholder={t.f_parish} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_address}</span>
                      <div className="geo-row">
                        <input
                          className="finput"
                          value={geoQuery}
                          onChange={(e) => setGeoQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (!geoBusy) geocodeAddress();
                            }
                          }}
                          placeholder={draft?.canonical_name || t.f_address}
                        />
                        <button className="btng geo-btn" onClick={geocodeAddress} disabled={geoBusy} type="button">
                          {geoBusy ? t.geoSearching : t.geoSearch}
                        </button>
                      </div>
                      {geoResults.length > 0 ? (
                        <div className="geo-results">
                          <span className="fhint">{t.geoPick}</span>
                          {geoResults.map((r, i) => (
                            <button key={i} type="button" className="geo-res" onClick={() => pickGeoResult(r)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10Z" />
                                <circle cx="12" cy="11" r="2" />
                              </svg>
                              <span>{r.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="fhint">{t.geoHint}</span>
                      )}
                    </div>
                    <div className="frow">
                      <div className="fld">
                        <span className="flabel">{t.f_lat}</span>
                        <input className="finput mono" value={draft?.lat || ""} onChange={setD("lat")} placeholder="10.50" inputMode="decimal" />
                      </div>
                      <div className="fld">
                        <span className="flabel">{t.f_lng}</span>
                        <input className="finput mono" value={draft?.lng || ""} onChange={setD("lng")} placeholder="-66.90" inputMode="decimal" />
                      </div>
                    </div>
                    <button type="button" className="btng geo-pickbtn" onClick={() => setPickingOnMap(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10Z" />
                        <circle cx="12" cy="11" r="2" />
                      </svg>
                      {t.geoPickMap}
                    </button>
                    <span className="fhint">{t.geoPickHint}</span>
                    {/* Civic initiative: what it is, what it does and — the point of the
                        type — the ways to help that are NOT money (db/iniciativas.sql). */}
                    {draft?.type === "iniciativa" && (
                      <div className="refedit">
                        <span className="refedit-h">{t.iniEditTitle}</span>
                        <div className="fld">
                          <span className="flabel">{t.f_iniCategoria}</span>
                          <input
                            className="finput"
                            value={draft?.ini_categoria || ""}
                            onChange={setD("ini_categoria")}
                            placeholder={t.f_iniCategoria}
                          />
                          <span className="fhint">{t.f_iniCategoriaHint}</span>
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_iniDesc}</span>
                          <textarea
                            className="finput"
                            rows={3}
                            value={draft?.ini_desc || ""}
                            onChange={(e) => setDraft((d) => ({ ...(d || {}), ini_desc: e.target.value }))}
                            placeholder={t.f_iniDesc}
                          />
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_iniAyuda}</span>
                          <div className="inipick">
                            {AYUDA_ORDER.map((k) => {
                              const on = (draft?.ini_ayuda || []).includes(k);
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  className={"inipickb " + (on ? "inipickb-on" : "")}
                                  onClick={() =>
                                    setDraft((d) => {
                                      const cur = d?.ini_ayuda || [];
                                      return { ...(d || {}), ini_ayuda: on ? cur.filter((x) => x !== k) : [...cur, k] };
                                    })
                                  }
                                >
                                  {AYUDA_META[k][lang]}
                                </button>
                              );
                            })}
                          </div>
                          <span className="fhint">{t.f_iniAyudaHint}</span>
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_iniSocial}</span>
                          <input
                            className="finput"
                            value={draft?.ini_social || ""}
                            onChange={setD("ini_social")}
                            placeholder="https://"
                          />
                        </div>
                      </div>
                    )}
                    {/* Refugio/acopio needs: for shelters AND puntos de acopio. Editable
                        by staff so each center's differing needs stay current (AcopioVE, §14).
                        Iniciativas reuse the same companion row, so they get it too. */}
                    {(draft?.type === "shelter" || draft?.type === "donation_centre" || draft?.type === "iniciativa") && (
                      <div className="refedit">
                        <span className="refedit-h">{t.refEditTitle}</span>
                        {/* Operating status FIRST: whether the point still exists matters
                            more than what it needs. Blank = sin dato (we never default a
                            point to "abierto" — AcopioVE already lists closed ones). */}
                        <div className="fld">
                          <span className="flabel">{t.f_refEstado}</span>
                          <div className="seg">
                            <button
                              className={"segb " + (!draft?.ref_estado ? "segb-on" : "")}
                              onClick={setDV("ref_estado", "")}
                            >
                              {t.f_refEstadoUnknown}
                            </button>
                            {ESTADO_ORDER.map((k) => (
                              <button
                                key={k}
                                className={"segb " + (draft?.ref_estado === k ? "segb-on" : "")}
                                onClick={setDV("ref_estado", k)}
                              >
                                {ESTADO_META[k][lang]}
                              </button>
                            ))}
                          </div>
                          <span className="fhint">{t.f_refEstadoHint}</span>
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refNecesita}</span>
                          <textarea
                            className="finput"
                            rows={3}
                            value={draft?.ref_necesita || ""}
                            onChange={(e) => setDraft((d) => ({ ...(d || {}), ref_necesita: e.target.value }))}
                            placeholder={t.f_refNecesita}
                          />
                          <span className="fhint">{t.f_refNecesitaHint}</span>
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refRecibe}</span>
                          <input
                            className="finput"
                            value={draft?.ref_recibe || ""}
                            onChange={setD("ref_recibe")}
                            placeholder="Agua, Alimentos, Medicamentos, Pañales"
                          />
                          <span className="fhint">{t.f_refRecibeHint}</span>
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refHorario}</span>
                          <input className="finput" value={draft?.ref_horario || ""} onChange={setD("ref_horario")} placeholder={t.f_refHorario} />
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refResponsable}</span>
                          <input className="finput" value={draft?.ref_responsable || ""} onChange={setD("ref_responsable")} placeholder={t.f_refResponsable} />
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refAddress}</span>
                          <input className="finput" value={draft?.ref_address || ""} onChange={setD("ref_address")} placeholder={t.f_refAddress} />
                        </div>
                        {/* "Is it an animal shelter?" only makes sense for a refugio.
                            Conditionally rendered, not [hidden]: .fld sets display:flex,
                            which as an author rule beats the UA [hidden]{display:none}. */}
                        {draft?.type !== "iniciativa" && (
                        <div className="fld">
                          <span className="flabel">{t.f_refAnimal}</span>
                          <div className="seg">
                            <button className={"segb " + (!draft?.ref_animal ? "segb-on" : "")} onClick={setDV("ref_animal", false)}>
                              {t.no}
                            </button>
                            <button className={"segb " + (draft?.ref_animal ? "segb-on" : "")} onClick={setDV("ref_animal", true)}>
                              {t.yes}
                            </button>
                          </div>
                        </div>
                        )}
                      </div>
                    )}
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={saveCenter}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deleteCenter(editId)}>
                        {t.del}
                      </button>
                    )}
                  </div>
                )}

                {editType === "donation" && (
                  <div className="form">
                    <div className="fld">
                      <span className="flabel">{t.f_donName}</span>
                      <input
                        className="finput"
                        value={draft?.don_name || ""}
                        onChange={setD("don_name")}
                        placeholder={t.f_donName}
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donDesc}</span>
                      <input
                        className="finput"
                        value={draft?.don_desc || ""}
                        onChange={setD("don_desc")}
                        placeholder={t.f_donDesc}
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donSocial}</span>
                      <input
                        className="finput"
                        type="url"
                        inputMode="url"
                        value={draft?.don_social || ""}
                        onChange={setD("don_social")}
                        placeholder="https://instagram.com/…"
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donUrl}</span>
                      <input
                        className="finput"
                        type="url"
                        inputMode="url"
                        value={draft?.don_url || ""}
                        onChange={setD("don_url")}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donInfo}</span>
                      <textarea
                        className="finput"
                        rows={4}
                        value={draft?.don_info || ""}
                        onChange={(e) => setDraft((d) => ({ ...(d || {}), don_info: e.target.value }))}
                        placeholder={t.f_donInfoHint}
                      />
                      <span className="fhint">{t.f_donInfoHint}</span>
                    </div>
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={saveDonation}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deleteDonation(editId)}>
                        {t.del}
                      </button>
                    )}
                  </div>
                )}

                {editType === "person" && (
                  <div className="form">
                    <div className="fld">
                      <span className="flabel">{t.f_ape}</span>
                      <input className="finput" value={draft?.apellidos || ""} onChange={setD("apellidos")} placeholder={t.f_ape} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_nom}</span>
                      <input className="finput" value={draft?.nombres || ""} onChange={setD("nombres")} placeholder={t.f_nom} />
                    </div>
                    <div className="frow">
                      <div className="fld">
                        <span className="flabel">{t.f_ci}</span>
                        <input className="finput mono" value={draft?.ci || ""} onChange={setD("ci")} placeholder="V-00.000.000" />
                      </div>
                      <div className="fld">
                        <span className="flabel">{t.f_edad}</span>
                        <input className="finput" value={draft?.edad || ""} onChange={setD("edad")} placeholder="00" inputMode="numeric" />
                      </div>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_sexo}</span>
                      <div className="seg">
                        <button className={"segb " + (draft?.sexo === "F" ? "segb-on" : "")} onClick={setDV("sexo", "F")}>
                          {t.female}
                        </button>
                        <button className={"segb " + (draft?.sexo === "M" ? "segb-on" : "")} onClick={setDV("sexo", "M")}>
                          {t.male}
                        </button>
                      </div>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_center}</span>
                      <select className="fselect" value={draft?.location_id || ""} onChange={setD("location_id")}>
                        {locations.map((l) => (
                          <option key={l.location_id} value={l.location_id}>
                            {l.canonical_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_status}</span>
                      <select className="fselect" value={draft?.estatus || "INGRESADO"} onChange={setD("estatus")}>
                        {statusOpts.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Verified is the publish gate (§8): a photo / FALLECIDO only shows
                        publicly once the record is verified. Open to all staff (admin OR
                        volunteer) — volunteers are trusted and their access is revocable. */}
                    {(isAdmin || isVolunteer) && (
                      <div className="fld">
                        <span className="flabel">{t.verified}</span>
                        <div className="seg">
                          <button className={"segb " + (!draft?.verified ? "segb-on" : "")} onClick={setDV("verified", false)}>
                            {t.verifiedNo}
                          </button>
                          <button className={"segb " + (draft?.verified ? "segb-on" : "")} onClick={setDV("verified", true)}>
                            {t.verifiedYes}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Pending photo/info contributions for THIS person — approve/reject in place. */}
                    {editId && contribs.some((c) => c.patient_id === editId) && (
                      <div className="fld">
                        <span className="flabel">{t.tabContribs}</span>
                        <span className="fhint">{t.contribReviewNote}</span>
                        {contribs
                          .filter((c) => c.patient_id === editId)
                          .map((c) => (
                            <div className="arow" key={c.id}>
                              {c.foto_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.foto_url} alt="" loading="lazy" decoding="async" className="upload-thumb" style={{ width: 48, height: 48, marginRight: 10 }} />
                              )}
                              <div className="ai">
                                {c.descripcion && <div className="asub">{c.descripcion}</div>}
                                {c.contacto && <div className="asub mono">{c.contacto}</div>}
                              </div>
                              <div className="aacts">
                                <button className="amini" title={t.contribApprove} onClick={() => reviewContribution(c.id, "approve")}>
                                  {ICON.check}
                                </button>
                                <button className="amini del" title={t.contribReject} onClick={() => reviewContribution(c.id, "reject")}>
                                  {ICON.trash}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={savePerson}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deletePerson(editId)}>
                        {t.del}
                      </button>
                    )}
                  </div>
                )}

                {editType === "rescatado" && (
                  <div className="form">
                    <div className="note">
                      <span className="resc-ic">{ICON.rescue}</span>
                      {t.rescuedFieldNote}
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_ape}</span>
                      <input className="finput" value={draft?.apellidos || ""} onChange={setD("apellidos")} placeholder={t.f_ape} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_nom}</span>
                      <input className="finput" value={draft?.nombres || ""} onChange={setD("nombres")} placeholder={t.f_nom} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_minor}</span>
                      <div className="seg">
                        <button className={"segb " + (!draft?.is_minor ? "segb-on" : "")} onClick={setDV("is_minor", false)}>
                          {t.no}
                        </button>
                        <button className={"segb " + (draft?.is_minor ? "segb-on" : "")} onClick={setDV("is_minor", true)}>
                          {t.yes}
                        </button>
                      </div>
                    </div>
                    <div className="frow">
                      <div className="fld">
                        <span className="flabel">{t.f_ci}</span>
                        <input
                          className="finput mono"
                          value={draft?.is_minor ? "MENOR" : draft?.ci || ""}
                          onChange={setD("ci")}
                          placeholder="V-00.000.000"
                          disabled={!!draft?.is_minor}
                        />
                      </div>
                      <div className="fld">
                        <span className="flabel">{t.f_edad}</span>
                        <input className="finput" value={draft?.edad || ""} onChange={setD("edad")} placeholder="00" inputMode="numeric" />
                      </div>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_sexo}</span>
                      <div className="seg">
                        <button className={"segb " + (draft?.sexo === "F" ? "segb-on" : "")} onClick={setDV("sexo", "F")}>
                          {t.female}
                        </button>
                        <button className={"segb " + (draft?.sexo === "M" ? "segb-on" : "")} onClick={setDV("sexo", "M")}>
                          {t.male}
                        </button>
                      </div>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_rescueSite}</span>
                      <input className="finput" value={draft?.rescue_site || ""} onChange={setD("rescue_site")} placeholder={t.f_rescueSite} />
                      <span className="fhint">{t.f_rescueSiteHint}</span>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_notas}</span>
                      <textarea
                        className="finput"
                        rows={3}
                        value={draft?.notas || ""}
                        onChange={(e) => setDraft((d) => ({ ...(d || {}), notas: e.target.value }))}
                        placeholder={t.f_notasHint}
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_contact}</span>
                      <input className="finput" value={draft?.contacto || ""} onChange={setD("contacto")} placeholder="+58…" />
                    </div>
                    <div className="note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                      </svg>
                      {t.rescuedPublicNote}
                    </div>
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={saveRescatado}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deleteRescatado(editId)}>
                        {t.del}
                      </button>
                    )}
                  </div>
                )}

                {editType === "promote" && (
                  <div className="form">
                    <div className="note">
                      <span className="resc-ic">{ICON.pin}</span>
                      {t.promoteHint}
                    </div>
                    <div className="arow" style={{ borderBottom: "none" }}>
                      <div className="ai">
                        <div className="aname">{((draft?.nombres || "") + " " + (draft?.apellidos || "")).trim() || "—"}</div>
                        <div className="asub">
                          {[
                            draft?.edad ? draft.edad + " " + t.yrs : null,
                            draft?.sexo === "M" ? t.male : draft?.sexo === "F" ? t.female : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_center}</span>
                      <select className="fselect" value={draft?.location_id || ""} onChange={setD("location_id")}>
                        {locations.map((l) => (
                          <option key={l.location_id} value={l.location_id}>
                            {l.canonical_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_status}</span>
                      <select className="fselect" value={draft?.estatus || "INGRESADO"} onChange={setD("estatus")}>
                        {statusOpts.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(isAdmin || isVolunteer) && (
                      <div className="fld">
                        <span className="flabel">{t.verified}</span>
                        <div className="seg">
                          <button className={"segb " + (!draft?.verified ? "segb-on" : "")} onClick={setDV("verified", false)}>
                            {t.verifiedNo}
                          </button>
                          <button className={"segb " + (draft?.verified ? "segb-on" : "")} onClick={setDV("verified", true)}>
                            {t.verifiedYes}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={savePromotion}>
                        {t.promoteTitle}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
  );
}
