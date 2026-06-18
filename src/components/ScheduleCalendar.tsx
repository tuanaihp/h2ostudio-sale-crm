import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Camera, Calendar as CalendarIcon, Heart, Package, User } from 'lucide-react';
import { Consultation, Style } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleCalendarProps {
  consultations: Consultation[];
  styles: Style[];
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ consultations, styles }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const registeredConsults = consultations.filter(c => c.status === 'registered');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getDayEvents = (day: Date) => {
    const events: { type: 'shooting' | 'engagement' | 'wedding' | 'delivery'; consult: Consultation }[] = [];
    
    registeredConsults.forEach(c => {
      if (c.shootingDate && isSameDay(new Date(c.shootingDate), day)) {
        events.push({ type: 'shooting', consult: c });
      }
      if (c.engagementDate && isSameDay(new Date(c.engagementDate), day)) {
        events.push({ type: 'engagement', consult: c });
      }
      if (c.weddingDate && isSameDay(new Date(c.weddingDate), day)) {
        events.push({ type: 'wedding', consult: c });
      }
      if (c.deliveryDate && isSameDay(new Date(c.deliveryDate), day)) {
        events.push({ type: 'delivery', consult: c });
      }
    });
    
    return events;
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getEventColor = (type: string) => {
    switch (type) {
      case 'shooting': return 'bg-blue-500';
      case 'engagement': return 'bg-pink-500';
      case 'wedding': return 'bg-red-500';
      case 'delivery': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'shooting': return <Camera size={10} />;
      case 'engagement': return <Heart size={10} />;
      case 'wedding': return <CalendarIcon size={10} />;
      case 'delivery': return <Package size={10} />;
      default: return null;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'shooting': return 'Chụp ảnh';
      case 'engagement': return 'Ăn hỏi';
      case 'wedding': return 'Ngày cưới';
      case 'delivery': return 'Trả ảnh';
      default: return '';
    }
  };

  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-light-gray overflow-hidden">
      <div className="p-6 border-b border-light-gray flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-dark capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: vi })}
          </h2>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-2 hover:bg-light-gray rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-light-gray rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Chụp ảnh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span>Ăn hỏi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Ngày cưới</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Trả ảnh</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-light-gray bg-light-gray/30">
        {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(day => (
          <div key={day} className="p-3 text-center text-xs font-bold text-dark/40 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const events = getDayEvents(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(day)}
              className={`min-h-[100px] p-2 border-b border-r border-light-gray cursor-pointer transition-colors relative ${
                !isCurrentMonth ? 'bg-light-gray/10' : 'hover:bg-light-gray/20'
              } ${isSelected ? 'bg-primary/5' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium ${
                  !isCurrentMonth ? 'text-dark/20' : 
                  isToday ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center -mt-1 -ml-1' : 'text-dark/60'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-1">
                {events.slice(0, 3).map((event, eIdx) => (
                  <div
                    key={eIdx}
                    className={`${getEventColor(event.type)} text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 truncate`}
                    title={`${getEventLabel(event.type)}: ${event.consult.name}`}
                  >
                    {getEventIcon(event.type)}
                    <span className="truncate">{event.consult.name}</span>
                  </div>
                ))}
                {events.length > 3 && (
                  <div className="text-[10px] text-dark/40 font-medium pl-1">
                    + {events.length - 3} thêm...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-6 bg-light-gray/30 border-t border-light-gray"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-dark">
                Sự kiện ngày {format(selectedDay, 'dd/MM/yyyy')}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-sm text-primary font-medium hover:underline">
                Đóng
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-dark/40 italic">Không có sự kiện nào trong ngày này.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDayEvents.map((event, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-light-gray flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${getEventColor(event.type)} text-white flex items-center justify-center shrink-0`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wider text-dark/40 mb-1">
                        {getEventLabel(event.type)}
                      </div>
                      <div className="font-bold text-dark truncate">{event.consult.name}</div>
                      <div className="text-xs text-dark/60 mt-1 flex items-center gap-1">
                        <User size={12} />
                        {event.consult.phone}
                      </div>
                      {event.consult.conceptId && (
                        <div className="mt-2 text-xs bg-light-gray px-2 py-1 rounded inline-block">
                          Concept: {(() => {
                            if (event.consult.conceptId.includes(':')) {
                              const [sId, aId] = event.consult.conceptId.split(':');
                              const style = styles.find(s => s.id === sId);
                              const album = style?.albums.find(a => a.id === aId);
                              return album ? `${style?.title} - ${album.title}` : 'Đã chọn Album';
                            }
                            return styles.find(s => s.id === event.consult.conceptId)?.title || 'Đã chọn Concept';
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
