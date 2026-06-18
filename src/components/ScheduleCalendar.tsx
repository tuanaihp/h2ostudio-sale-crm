import React, { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Camera, Calendar as CalendarIcon,
  Heart, Package, Phone, MessageCircle, DollarSign, User, X,
} from 'lucide-react';
import { Consultation, Style } from '../types';
import { motion, AnimatePresence } from 'motion/react';

// ─── Staff color palette (full class names for Tailwind purge safety) ─────────
const STAFF_PALETTE = [
  { dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
  { dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700'  },
  { dot: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700'   },
  { dot: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-700'   },
  { dot: 'bg-cyan-500',   badge: 'bg-cyan-100 text-cyan-700'   },
  { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
];

// ─── Event types ──────────────────────────────────────────────────────────────
type EventType = 'shooting' | 'engagement' | 'wedding' | 'delivery' | 'followup';

const EVENT_CONFIG: Record<EventType, {
  label: string; bg: string; light: string; border: string; icon: React.ReactNode;
}> = {
  shooting:   { label: 'Chụp ảnh',  bg: 'bg-blue-500',   light: 'bg-blue-50 text-blue-700',   border: 'border-blue-200',   icon: <Camera size={10} /> },
  engagement: { label: 'Ăn hỏi',    bg: 'bg-pink-500',   light: 'bg-pink-50 text-pink-700',   border: 'border-pink-200',   icon: <Heart size={10} /> },
  wedding:    { label: 'Ngày cưới', bg: 'bg-red-500',    light: 'bg-red-50 text-red-700',     border: 'border-red-200',    icon: <CalendarIcon size={10} /> },
  delivery:   { label: 'Trả ảnh',   bg: 'bg-green-500',  light: 'bg-green-50 text-green-700', border: 'border-green-200',  icon: <Package size={10} /> },
  followup:   { label: 'Hẹn gọi',   bg: 'bg-purple-500', light: 'bg-purple-50 text-purple-700', border: 'border-purple-200', icon: <Phone size={10} /> },
};

const EVENT_ORDER: Record<EventType, number> = {
  followup: 0, shooting: 1, engagement: 2, wedding: 3, delivery: 4,
};

interface CalEvent { type: EventType; consult: Consultation; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildStaffMap = (consultations: Consultation[]): Record<string, number> => {
  const names = [...new Set(
    consultations.filter(c => c.assignedTo?.trim()).map(c => c.assignedTo!.trim())
  )].sort();
  return Object.fromEntries(names.map((n, i) => [n, i]));
};

const staffColors = (name: string | undefined, map: Record<string, number>) => {
  if (!name?.trim()) return null;
  return STAFF_PALETTE[(map[name.trim()] ?? 0) % STAFF_PALETTE.length];
};

const getDayEvents = (day: Date, consultations: Consultation[]): CalEvent[] => {
  const events: CalEvent[] = [];
  consultations.forEach(c => {
    if (c.status === 'registered') {
      if (c.shootingDate   && isSameDay(new Date(c.shootingDate), day))   events.push({ type: 'shooting', consult: c });
      if (c.engagementDate && isSameDay(new Date(c.engagementDate), day)) events.push({ type: 'engagement', consult: c });
      if (c.weddingDate    && isSameDay(new Date(c.weddingDate), day))    events.push({ type: 'wedding', consult: c });
      if (c.deliveryDate   && isSameDay(new Date(c.deliveryDate), day))   events.push({ type: 'delivery', consult: c });
    }
    if (c.followUpDate && isSameDay(new Date(c.followUpDate), day))
      events.push({ type: 'followup', consult: c });
  });
  return events.sort((a, b) => EVENT_ORDER[a.type] - EVENT_ORDER[b.type]);
};

// ─── Event tag — compact chip used inside the grid cell ──────────────────────
const EventTag: React.FC<{
  event: CalEvent;
  staffMap: Record<string, number>;
  showStaff?: boolean;
}> = ({ event, staffMap, showStaff }) => {
  const cfg = EVENT_CONFIG[event.type];
  const sc = staffColors(event.consult.assignedTo, staffMap);
  return (
    <div
      className={`${cfg.bg} text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 w-full truncate`}
      title={`${cfg.label}: ${event.consult.name}${event.consult.assignedTo ? ` · ${event.consult.assignedTo}` : ''}`}
    >
      <span className="shrink-0">{cfg.icon}</span>
      <span className="truncate flex-1 font-medium">{event.consult.name}</span>
      {showStaff && sc && event.consult.assignedTo && (
        <span className={`shrink-0 text-[8px] font-bold px-1 rounded ${sc.badge}`}>
          {event.consult.assignedTo.split(' ').slice(-1)[0]}
        </span>
      )}
    </div>
  );
};

// ─── Event card — full detail card in the day panel ──────────────────────────
const EventCard: React.FC<{
  event: CalEvent;
  styles: Style[];
  staffMap: Record<string, number>;
}> = ({ event, styles, staffMap }) => {
  const { consult, type } = event;
  const cfg = EVENT_CONFIG[type];
  const sc = staffColors(consult.assignedTo, staffMap);

  const conceptName = (() => {
    if (!consult.conceptId) return null;
    if (consult.conceptId.includes(':')) {
      const [sId, aId] = consult.conceptId.split(':');
      const style = styles.find(s => s.id === sId);
      const album = style?.albums.find(a => a.id === aId);
      return album ? `${style?.title} · ${album.title}` : null;
    }
    return styles.find(s => s.id === consult.conceptId)?.title ?? null;
  })();

  return (
    <div className={`bg-white rounded-xl border ${cfg.border} shadow-sm overflow-hidden`}>
      <div className={`${cfg.bg} h-1`} />
      <div className="p-3 space-y-2">
        {/* Type + contract value */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.light}`}>
            {cfg.icon}{cfg.label}
          </span>
          {consult.contractValue && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-700">
              <DollarSign size={9} />{(consult.contractValue / 1_000_000).toFixed(1)}M
            </span>
          )}
        </div>

        {/* Name */}
        <div className="font-bold text-dark text-sm leading-tight">{consult.name}</div>

        {/* Assigned to */}
        {consult.assignedTo && (
          <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc ? sc.badge : 'bg-gray-100 text-gray-600'}`}>
            <User size={9} />{consult.assignedTo}
          </div>
        )}

        {/* Concept */}
        {conceptName && (
          <div className="text-[10px] text-dark/50 bg-light-gray/60 px-2 py-1 rounded truncate">
            {conceptName}
          </div>
        )}

        {/* Notes */}
        {consult.notes && (
          <p className="text-[10px] text-dark/50 italic line-clamp-1">{consult.notes}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 pt-1">
          <a
            href={`tel:${consult.phone}`}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <Phone size={9} />{consult.phone}
          </a>
          <a
            href={`https://zalo.me/${consult.phone}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-lg hover:bg-blue-600 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <MessageCircle size={9} />Zalo
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ScheduleCalendarProps {
  consultations: Consultation[];
  styles: Style[];
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ consultations, styles }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const staffMap = useMemo(() => buildStaffMap(consultations), [consultations]);

  const prevPeriod = () => {
    setSelectedDay(null);
    setCurrentDate(prev => viewMode === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1));
  };
  const nextPeriod = () => {
    setSelectedDay(null);
    setCurrentDate(prev => viewMode === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1));
  };

  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const ms = startOfMonth(currentDate);
      return eachDayOfInterval({
        start: startOfWeek(ms, { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(ms), { weekStartsOn: 1 }),
      });
    }
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    });
  }, [currentDate, viewMode]);

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: vi });
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(ws, 'dd/MM')} – ${format(we, 'dd/MM/yyyy')}`;
  }, [currentDate, viewMode]);

  const selectedDayEvents = useMemo(
    () => selectedDay ? getDayEvents(selectedDay, consultations) : [],
    [selectedDay, consultations],
  );

  const staffNames = useMemo(
    () => Object.keys(staffMap).sort((a, b) => staffMap[a] - staffMap[b]),
    [staffMap],
  );

  const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-light-gray overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-light-gray flex flex-col gap-3">
        {/* Row 1: nav + title + view toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={prevPeriod} className="p-1.5 hover:bg-light-gray rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextPeriod} className="p-1.5 hover:bg-light-gray rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
            <h2 className="text-base font-bold text-dark capitalize ml-1">{headerTitle}</h2>
          </div>

          <div className="flex bg-light-gray/70 rounded-xl p-1 gap-0.5">
            {(['month', 'week'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setViewMode(m); setSelectedDay(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === m ? 'bg-white shadow-sm text-dark' : 'text-dark/50 hover:text-dark'
                }`}
              >
                {m === 'month' ? 'Tháng' : 'Tuần'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: event legend + staff legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {(Object.keys(EVENT_CONFIG) as EventType[]).map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${EVENT_CONFIG[type].bg}`} />
              <span className="text-[11px] text-dark/60 font-medium">{EVENT_CONFIG[type].label}</span>
            </div>
          ))}

          {staffNames.length > 0 && (
            <div className="flex items-center gap-2 pl-3 border-l border-light-gray ml-1">
              <span className="text-[10px] text-dark/40 uppercase tracking-wider font-bold">Sale:</span>
              {staffNames.map(name => {
                const p = STAFF_PALETTE[staffMap[name] % STAFF_PALETTE.length];
                return (
                  <span key={name} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    {name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Day names row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 bg-light-gray/30 border-b border-light-gray">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-bold text-dark/40 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const events = getDayEvents(day, consultations);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isToday = isSameDay(day, new Date());
          const maxVisible = viewMode === 'week' ? 99 : 2;
          const hiddenCount = Math.max(0, events.length - maxVisible);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`
                ${viewMode === 'month' ? 'min-h-[88px]' : 'min-h-[160px]'}
                p-1.5 border-b border-r border-light-gray last:border-r-0 cursor-pointer transition-colors
                ${!isCurrentMonth && viewMode === 'month' ? 'opacity-30' : 'hover:bg-primary/5'}
                ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : ''}
              `}
            >
              {/* Day number + event count badge */}
              <div className="flex justify-between items-center mb-1">
                <span className={`
                  text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0
                  ${isToday ? 'bg-primary text-white' : 'text-dark/60'}
                `}>
                  {format(day, 'd')}
                </span>
                {events.length > 0 && (
                  <span className={`text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                    events.length >= 3 ? 'bg-red-100 text-red-600' : 'text-dark/30'
                  }`}>
                    {events.length}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-0.5">
                {events.slice(0, maxVisible).map((ev, eIdx) => (
                  <EventTag key={eIdx} event={ev} staffMap={staffMap} showStaff={viewMode === 'week'} />
                ))}
                {hiddenCount > 0 && (
                  <div className="text-[9px] text-dark/40 font-medium pl-1">
                    +{hiddenCount} thêm
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Day detail panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-light-gray"
          >
            <div className="p-4 md:p-6 bg-gradient-to-b from-light-gray/30 to-transparent">
              {/* Panel header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-dark text-base capitalize">
                    {format(selectedDay, 'EEEE, dd/MM/yyyy', { locale: vi })}
                  </h3>
                  <p className="text-xs text-dark/50 mt-0.5">
                    {selectedDayEvents.length === 0
                      ? 'Không có sự kiện nào'
                      : `${selectedDayEvents.length} sự kiện cần xử lý`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 hover:bg-light-gray rounded-lg transition-colors text-dark/40 hover:text-dark"
                >
                  <X size={16} />
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-dark/30">
                  <CalendarIcon size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Ngày trống — chưa có lịch nào.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {selectedDayEvents.map((ev, idx) => (
                    <EventCard key={idx} event={ev} styles={styles} staffMap={staffMap} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
