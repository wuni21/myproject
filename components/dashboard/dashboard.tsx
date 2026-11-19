"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, CalendarDays, CarFront, Check, ChevronRight, CircleHelp, Cloud, CloudRain, CloudSun, ExternalLink, Heart, LayoutGrid, Link2, MapPin, Moon, Pencil, Plus, Search, Sparkles, Sun, Trash2, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { ResourceEditDialog, TaskEditDialog } from "./edit-dialog";

export type Section = "home" | "schedule" | "car" | "family" | "resources";
type TaskKind = "schedule" | "car" | "family";
type Task = { id: string; kind: TaskKind; title: string; date: string; time: string; important: boolean; done: boolean };
type Resource = { id: string; title: string; url: string; note: string; created: string };
type City = { id: string; name: string; country: string; latitude: number; longitude: number; timezone: string };
type Weather = { temperature: number; code: number };

const SEOUL: City = { id: "seoul", name: "서울", country: "대한민국", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" };
const NAV = [
  { id: "home", label: "대시보드", href: "/", icon: LayoutGrid },
  { id: "schedule", label: "일정 관리", href: "/schedule", icon: CalendarDays },
  { id: "car", label: "자동차 관리", href: "/car", icon: CarFront },
  { id: "family", label: "자녀 관리", href: "/family", icon: UsersRound },
  { id: "resources", label: "자료 보관함", href: "/resources", icon: Bookmark },
] as const;
const DETAILS = {
  schedule: { title: "일정 관리", subtitle: "하루의 할 일을 가볍게 정리해 보세요.", placeholder: "어떤 일정이 있나요?" },
  car: { title: "자동차 관리", subtitle: "놓치기 쉬운 자동차 관리 일정도 꼼꼼하게.", placeholder: "예: 자동차 보험 갱신" },
  family: { title: "자녀 관리", subtitle: "우리 아이의 중요한 순간을 기억해요.", placeholder: "예: 학교 준비물 챙기기" },
};

function dateKey(date: Date, zone = "Asia/Seoul") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function dateText(date: Date, zone: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: zone, month: "long", day: "numeric", weekday: "long" }).format(date);
}
function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if (code <= 3) return "구름 조금";
  if (code <= 48) return "흐림";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "눈";
  return "비";
}
function WeatherIcon({ code, size = 28 }: { code?: number; size?: number }) {
  if (code === undefined) return <Cloud size={size} />;
  if (code === 0) return <Sun size={size} />;
  if (code <= 3) return <CloudSun size={size} />;
  if (code <= 48) return <Cloud size={size} />;
  return <CloudRain size={size} />;
}
function readStorage<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

export function Dashboard({ section }: { section: Section }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [cities, setCities] = useState<City[]>([SEOUL]);
  const [weather, setWeather] = useState<Record<string, Weather>>({});
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [important, setImportant] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceNote, setResourceNote] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTasks(readStorage("daylog-tasks", []));
      setResources(readStorage("daylog-resources", []));
      setCities(readStorage("daylog-cities", [SEOUL]));
      setDark(readStorage("daylog-dark", false));
      const current = new Date();
      setNow(current);
      setDate(dateKey(current));
      if (window.location.pathname === "/share") {
        const params = new URLSearchParams(window.location.search);
        const sharedText = params.get("text") || "";
        const sharedUrl = params.get("url") || sharedText.match(/https?:\/\/\S+/)?.[0] || "";
        setResourceTitle(params.get("title") || "");
        setResourceUrl(sharedUrl);
        setResourceNote(sharedText.replace(sharedUrl, "").trim());
        window.history.replaceState(null, "", "/resources");
      }
      setReady(true);
    }, 0);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { window.clearTimeout(timer); window.clearInterval(clock); };
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("daylog-tasks", JSON.stringify(tasks));
  }, [tasks, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("daylog-resources", JSON.stringify(resources));
  }, [resources, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("daylog-cities", JSON.stringify(cities));
  }, [cities, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("daylog-dark", JSON.stringify(dark));
  }, [dark, ready]);
  useEffect(() => {
    function syncStorage(event: StorageEvent) {
      if (event.storageArea !== localStorage) return;
      if (event.key === "daylog-tasks") setTasks(readStorage("daylog-tasks", []));
      if (event.key === "daylog-resources") setResources(readStorage("daylog-resources", []));
      if (event.key === "daylog-cities") setCities(readStorage("daylog-cities", [SEOUL]));
      if (event.key === "daylog-dark") setDark(readStorage("daylog-dark", false));
    }
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, []);
  useEffect(() => {
    if (!ready) return;
    cities.forEach((city) => {
      const params = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude), current: "temperature_2m,weather_code", timezone: city.timezone });
      fetch(`https://api.open-meteo.com/v1/forecast?${params}`).then((res) => { if (!res.ok) throw new Error(); return res.json(); }).then((data) => {
        setWeather((old) => ({ ...old, [city.id]: { temperature: data.current.temperature_2m, code: data.current.weather_code } }));
      }).catch(() => setWeather((old) => { const next = { ...old }; delete next[city.id]; return next; }));
    });
  }, [cities, ready]);

  const today = now ? dateKey(now) : "";
  const todayTasks = tasks.filter((task) => task.kind === "schedule" && task.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const importantTasks = (kind: TaskKind) => tasks.filter((task) => task.kind === kind && task.important && !task.done && (!task.date || task.date >= today)).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const toggleTask = (id: string) => setTasks((old) => old.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const deleteTask = (id: string) => setTasks((old) => old.filter((task) => task.id !== id));

  async function searchCities(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearchMessage("지역을 찾고 있어요...");
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=ko&format=json`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const found: City[] = (data.results || []).filter((item: { timezone?: string }) => item.timezone).map((item: { id: number; name: string; country?: string; admin1?: string; latitude: number; longitude: number; timezone: string }) => ({ id: String(item.id), name: item.name, country: [item.admin1, item.country].filter(Boolean).join(", "), latitude: item.latitude, longitude: item.longitude, timezone: item.timezone }));
      setResults(found);
      setSearchMessage(found.length ? "" : "검색 결과가 없어요. 영문 지역명으로도 검색해 보세요.");
    } catch { setResults([]); setSearchMessage("지역을 불러오지 못했어요. 연결 상태를 확인해 주세요."); }
  }
  function addTask(event: FormEvent, kind: TaskKind) {
    event.preventDefault();
    if (!title.trim()) return;
    setTasks((old) => [...old, { id: crypto.randomUUID(), kind, title: title.trim(), date, time, important, done: false }]);
    setTitle(""); setTime(""); setImportant(false);
  }
  function addResource(event: FormEvent) {
    event.preventDefault();
    try {
      const parsed = new URL(resourceUrl.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) return;
      setResources((old) => [{ id: crypto.randomUUID(), title: resourceTitle.trim() || parsed.hostname, url: parsed.toString(), note: resourceNote.trim(), created: dateKey(new Date()) }, ...old]);
      setResourceTitle(""); setResourceUrl(""); setResourceNote("");
    } catch { /* The URL input provides validation. */ }
  }

  return (
    <div className={`app-shell${dark ? " dark-mode" : ""}`}>
      <aside className="sidebar">
        <Link href="/" className="brand"><span className="brand-mark">d<span>.</span></span><span>DAYLOG<small>YOUR DAILY SPACE</small></span></Link>
        <div className="sidebar-label">MY SPACE <span>✳</span></div>
        <nav className="nav" aria-label="주 메뉴">{NAV.map(({ id, label, href, icon: Icon }) => <Link key={id} href={href} className={section === id ? "active" : ""}><Icon size={18}/><span>{label}</span>{section === id && <span className="nav-dot" />}</Link>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={17}/><p>매일의 작은 기록이<br/><strong>더 나은 하루</strong>를 만들어요.</p></div><div className="profile"><div className="avatar">☺</div><div><strong>나의 공간</strong><small>나를 위한 대시보드</small></div><span>···</span></div></div>
      </aside>
      <div className="main-shell">
        <header className="topbar"><div className="breadcrumb">MY SPACE <ChevronRight size={13}/> <strong>{NAV.find((item) => item.id === section)?.label}</strong></div><div className="top-actions"><span className="top-date">{now ? dateText(now, "Asia/Seoul") : "오늘도 좋은 하루"}</span><button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><div className="top-avatar">☺</div></div></header>
        <main className="content">
          {section === "home" ? <>
            <div className="greeting"><div><div className="eyebrow"><span className="live-dot"/> A LITTLE BETTER EVERY DAY</div><h1>나의 하루를, 한눈에<span className="heading-dot">.</span></h1><p>흩어진 일상들을 한곳에, 오늘도 나답게 채워가요.</p></div><div className="greeting-stamp"><Sparkles size={16}/> MAKE YOUR DAY <span>✳</span></div></div>
            <div className="dashboard-grid">
              <section className="weather-card"><div className="weather-top"><div><div className="weather-kicker"><span className="live-dot"/> TODAY&apos;S WEATHER</div><h2>지금, 우리의 날씨</h2><p>어디에 있든, 오늘의 하늘을 확인해요.</p></div><button onClick={() => setCityOpen(true)} className="weather-add"><Plus size={15}/> 지역 추가</button></div><div className="city-list">{cities.map((city, index) => <div className="city" key={city.id}><div className="city-heading"><MapPin size={14}/><strong>{city.name}</strong><span>{index === 0 ? "기본 지역" : city.country}</span>{index !== 0 && <button className="remove-city" aria-label={`${city.name} 지역 삭제`} onClick={() => setCities((old) => old.filter((item) => item.id !== city.id))}><X size={14}/></button>}</div><div className="city-body"><div><div className="city-time">{now ? new Intl.DateTimeFormat("ko-KR", { timeZone: city.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now) : "--:--"}</div><div className="city-date">{now ? dateText(now, city.timezone) : "시간 불러오는 중"}</div></div><div className="city-weather"><WeatherIcon code={weather[city.id]?.code} size={38}/><div><strong>{weather[city.id] ? `${Math.round(weather[city.id].temperature)}°` : "--°"}</strong><span>{weather[city.id] ? weatherLabel(weather[city.id].code) : "날씨 확인 중"}</span></div></div></div></div>)}</div><div className="weather-footer"><span><span className="live-dot"/> LIVE WEATHER · OPEN-METEO</span><span>GOOD DAY, GOOD LIFE ↗</span></div></section>
              <section className="card schedule-card"><CardHeading icon={<CalendarDays size={18}/>} kicker="TODAY'S PLAN" title="오늘의 일정" href="/schedule"/><div className="schedule-intro"><span>오늘의 할 일</span><strong>{todayTasks.filter((task) => !task.done).length}<small>개 남음</small></strong></div><div className="mini-list">{todayTasks.length ? todayTasks.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} toggle={toggleTask}/>) : <Empty icon={<CalendarDays size={21}/>} text="오늘 등록된 일정이 없어요" sub="여유로운 하루의 시작이에요."/>}</div><Link className="card-link" href="/schedule">일정 관리하기 <ArrowRight size={15}/></Link></section>
              <SummaryCard icon={<CarFront size={18}/>} kicker="MY CAR" title="자동차 관리" href="/car" items={importantTasks("car")} empty="중요한 자동차 일정이 없어요" color="peach" />
              <SummaryCard icon={<Heart size={18}/>} kicker="MY FAMILY" title="자녀 관리" href="/family" items={importantTasks("family")} empty="중요한 자녀 일정이 없어요" color="lavender" />
              <section className="card resource-card"><CardHeading icon={<Bookmark size={18}/>} kicker="SAVED FOR LATER" title="저장한 자료" href="/resources"/><p className="card-description">나중에 다시 보고 싶은 것들을 모아두세요.</p>{resources.length ? <div className="resource-preview">{resources.slice(0, 2).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span className="resource-icon"><Link2 size={16}/></span><span><strong>{item.title}</strong><small>{new URL(item.url).hostname}</small></span><ArrowUpRight size={16}/></a>)}</div> : <Empty icon={<Bookmark size={21}/>} text="아직 저장한 자료가 없어요" sub="마음에 드는 링크를 담아보세요."/>}<Link className="card-link" href="/resources">보관함 바로가기 <ArrowRight size={15}/></Link></section>
              <div className="bottom-banner"><span className="banner-sparkle">✳</span><div><strong>당신의 일상에 작은 여유를.</strong><p>오늘도 충분히 잘하고 있어요. 하나씩 천천히 해봐요!</p></div><span className="banner-end">A LITTLE NOTE FOR YOU <ArrowUpRight size={16}/></span></div>
            </div>
          </> : section === "resources" ? <>
            <PageHeader eyebrow="YOUR LITTLE LIBRARY" title="자료 보관함" subtitle="다시 보고 싶은 링크와 생각을 한곳에 모아두세요." />
            <div className="management-grid"><section className="card form-card"><div className="form-title"><span className="icon-tile sage"><Link2 size={19}/></span><div><h2>새 자료 저장하기</h2><p>좋은 발견은 잊지 않도록.</p></div></div><form onSubmit={addResource} className="form"><label>링크 주소<input type="url" required value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://" /></label><label>제목 <span>선택</span><input value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} placeholder="어떤 자료인가요?" /></label><label>메모 <span>선택</span><textarea value={resourceNote} onChange={(e) => setResourceNote(e.target.value)} placeholder="기억하고 싶은 내용을 적어보세요." rows={3}/></label><button className="primary-button" type="submit"><Plus size={17}/> 자료 저장하기</button></form><div className="form-hint"><CircleHelp size={15}/> 지원하는 브라우저에서 앱을 설치하면 공유 메뉴로 링크를 보낼 수 있어요. 또는 링크를 직접 붙여넣어 주세요.</div></section><section className="card list-card"><div className="list-heading"><div><span className="section-kicker">YOUR COLLECTION</span><h2>모아둔 자료 <em>{resources.length}</em></h2></div><Bookmark size={20}/></div>{resources.length ? <div className="saved-list">{resources.map((item) => <div className="saved-item" key={item.id}><span className="resource-icon"><Link2 size={17}/></span><div><a href={item.url} target="_blank" rel="noreferrer">{item.title} <ExternalLink size={13}/></a><small>{new URL(item.url).hostname} · {item.created}</small>{item.note && <p>{item.note}</p>}</div><button className="plain-icon" aria-label={`${item.title} 수정`} onClick={() => setEditingResource(item)}><Pencil size={16}/></button><button className="plain-icon" aria-label={`${item.title} 삭제`} onClick={() => setResources((old) => old.filter((resource) => resource.id !== item.id))}><Trash2 size={16}/></button></div>)}</div> : <Empty icon={<Bookmark size={24}/>} text="아직 저장한 자료가 없어요" sub="첫 번째 링크를 저장해 보세요."/>}</section></div>
          </> : <>
            <PageHeader eyebrow={section === "schedule" ? "MAKE A LITTLE PLAN" : section === "car" ? "KEEP IT RUNNING" : "FOR YOUR FAMILY"} title={DETAILS[section].title} subtitle={DETAILS[section].subtitle}/>
            <div className="management-grid"><section className="card form-card"><div className="form-title"><span className="icon-tile sage"><Plus size={20}/></span><div><h2>새 일정 추가하기</h2><p>기억해야 할 일을 적어두세요.</p></div></div><form className="form" onSubmit={(event) => addTask(event, section)}><label>일정 이름<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={DETAILS[section].placeholder}/></label><div className="form-row"><label>날짜<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required={section === "schedule"}/></label><label>시간 <span>선택</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)}/></label></div><label className="checkbox-label"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)}/> 중요한 일정으로 표시하기</label><button className="primary-button" type="submit"><Plus size={17}/> 일정 추가하기</button></form><div className="form-hint"><Sparkles size={15}/> {section === "schedule" ? "오늘 날짜의 일정은 대시보드에 표시돼요." : "중요 일정으로 표시하면 대시보드에서 볼 수 있어요."}</div></section><section className="card list-card"><div className="list-heading"><div><span className="section-kicker">ALL YOUR PLANS</span><h2>나의 일정 <em>{tasks.filter((task) => task.kind === section).length}</em></h2></div><CalendarDays size={20}/></div><div className="full-task-list">{tasks.filter((task) => task.kind === section).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.time.localeCompare(b.time)).map((task) => <TaskRow key={task.id} task={task} toggle={toggleTask} remove={deleteTask} edit={setEditingTask}/>)}</div>{!tasks.some((task) => task.kind === section) && <Empty icon={<CalendarDays size={24}/>} text="아직 등록된 일정이 없어요" sub="첫 번째 일정을 추가해 보세요."/>}</section></div>
          </>}
          <footer className="footer"><span>© DAYLOG. MADE FOR YOUR EVERYDAY.</span><span>YOUR DAY, YOUR WAY <span>✳</span></span></footer>
        </main>
      </div>
      {editingTask && <TaskEditDialog task={editingTask} onClose={() => setEditingTask(null)} onSave={(updated) => { setTasks((old) => old.map((task) => task.id === updated.id ? { ...task, title: updated.title, date: updated.date, time: updated.time, important: updated.important } : task)); setEditingTask(null); }}/>} 
      {editingResource && <ResourceEditDialog resource={editingResource} onClose={() => setEditingResource(null)} onSave={(updated) => { setResources((old) => old.map((resource) => resource.id === updated.id ? { ...resource, title: updated.title, url: updated.url, note: updated.note } : resource)); setEditingResource(null); }}/>} 
      {cityOpen && <div className="modal-backdrop" onClick={() => setCityOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="city-title" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="section-kicker">AROUND THE WORLD</span><h2 id="city-title">지역 추가하기</h2></div><button className="icon-button" onClick={() => setCityOpen(false)} aria-label="닫기"><X size={19}/></button></div><p>여행지나 출장지의 시간과 날씨를 함께 확인해요.</p><form className="search-box" onSubmit={searchCities}><Search size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="도시 이름 검색 (예: Tokyo)"/><button type="submit">검색</button></form>{searchMessage && <p className="search-message">{searchMessage}</p>}<div className="search-results">{results.map((city) => <button key={city.id} onClick={() => { if (!cities.some((item) => item.id === city.id || (item.latitude === city.latitude && item.longitude === city.longitude))) setCities((old) => [...old, city]); setCityOpen(false); setQuery(""); setResults([]); }}><MapPin size={17}/><span><strong>{city.name}</strong><small>{city.country}</small></span><Plus size={17}/></button>)}</div></div></div>}
    </div>
  );
}

function CardHeading({ icon, kicker, title, href }: { icon: ReactNode; kicker: string; title: string; href: string }) { return <div className="card-heading"><div className="heading-left"><span className="icon-tile">{icon}</span><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div></div><Link href={href} aria-label={`${title} 더 보기`} className="arrow-link"><ArrowUpRight size={18}/></Link></div>; }
function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <div className="greeting page-greeting"><div><div className="eyebrow"><span className="live-dot"/> {eyebrow}</div><h1>{title}<span className="heading-dot">.</span></h1><p>{subtitle}</p></div><div className="greeting-stamp"><Sparkles size={16}/> MAKE YOUR DAY <span>✳</span></div></div>; }
function Empty({ icon, text, sub }: { icon: ReactNode; text: string; sub: string }) { return <div className="empty"><span>{icon}</span><strong>{text}</strong><small>{sub}</small></div>; }
function TaskRow({ task, toggle, remove, edit }: { task: Task; toggle: (id: string) => void; remove?: (id: string) => void; edit?: (task: Task) => void }) { return <div className={`task-row${task.done ? " done" : ""}`}><button className="task-check" onClick={() => toggle(task.id)} aria-label={`${task.title} ${task.done ? "완료 취소" : "완료"}`}>{task.done && <Check size={13}/>}</button><div className="task-content"><strong>{task.title} {task.important && <span className="important">중요</span>}</strong><small>{[task.date, task.time].filter(Boolean).join(" · ") || "날짜 미지정"}</small></div>{edit && <button className="plain-icon" onClick={() => edit(task)} aria-label={`${task.title} 수정`}><Pencil size={16}/></button>}{remove && <button className="plain-icon" onClick={() => remove(task.id)} aria-label={`${task.title} 삭제`}><Trash2 size={16}/></button>}</div>; }
function SummaryCard({ icon, kicker, title, href, items, empty, color }: { icon: ReactNode; kicker: string; title: string; href: string; items: Task[]; empty: string; color: string }) { return <section className="card summary-card"><CardHeading icon={icon} kicker={kicker} title={title} href={href}/><div className={`summary-content ${color}`}><div className="summary-caption"><span>꼭 챙겨야 할 일정</span><span>IMPORTANT ✳</span></div>{items.length ? items.slice(0, 2).map((task) => <div className="summary-item" key={task.id}><div><strong>{task.title}</strong><small>{[task.date, task.time].filter(Boolean).join(" · ") || "날짜 미지정"}</small></div><ArrowUpRight size={15}/></div>) : <div className="summary-empty"><span><Check size={16}/></span><div><strong>{empty}</strong><small>중요 일정을 등록해 보세요.</small></div></div>}</div><Link className="card-link" href={href}>자세히 보기 <ArrowRight size={15}/></Link></section>; }