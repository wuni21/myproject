"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

type Task = { id: string; kind: "schedule" | "car" | "family"; title: string; date: string; time: string; important: boolean; done: boolean };
type Resource = { id: string; title: string; url: string; note: string; created: string };

export function TaskEditDialog({ task, onSave, onClose }: { task: Task; onSave: (task: Task) => void; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date);
  const [time, setTime] = useState(task.time);
  const [important, setImportant] = useState(task.important);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ ...task, title: title.trim(), date, time, important });
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-task-title" onClick={(event) => event.stopPropagation()}>
    <div className="modal-heading"><h2 id="edit-task-title">일정 수정</h2><button className="icon-button" type="button" onClick={onClose} aria-label="닫기"><X size={19}/></button></div>
    <form className="form" onSubmit={submit}>
      <label>일정 이름<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="form-row"><label>날짜<input type="date" required={task.kind === "schedule"} value={date} onChange={(event) => setDate(event.target.value)} /></label><label>시간<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
      <label className="checkbox-label"><input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} /> 중요한 일정으로 표시하기</label>
      <div className="edit-actions"><button className="secondary-button" type="button" onClick={onClose}>취소</button><button className="primary-button" type="submit">변경사항 저장</button></div>
    </form>
  </div></div>;
}

export function ResourceEditDialog({ resource, onSave, onClose }: { resource: Resource; onSave: (resource: Resource) => void; onClose: () => void }) {
  const [title, setTitle] = useState(resource.title);
  const [url, setUrl] = useState(resource.url);
  const [note, setNote] = useState(resource.note);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      onSave({ ...resource, title: title.trim() || parsed.hostname, url: parsed.toString(), note: note.trim() });
    } catch { setError("올바른 http 또는 https 링크를 입력해 주세요."); }
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-resource-title" onClick={(event) => event.stopPropagation()}>
    <div className="modal-heading"><h2 id="edit-resource-title">자료 수정</h2><button className="icon-button" type="button" onClick={onClose} aria-label="닫기"><X size={19}/></button></div>
    <form className="form" onSubmit={submit}>
      <label>링크 주소<input autoFocus type="url" required value={url} onChange={(event) => setUrl(event.target.value)} /></label>
      <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>메모<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {error && <p className="edit-error" role="alert">{error}</p>}
      <div className="edit-actions"><button className="secondary-button" type="button" onClick={onClose}>취소</button><button className="primary-button" type="submit">변경사항 저장</button></div>
    </form>
  </div></div>;
}