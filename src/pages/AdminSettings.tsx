import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { Navigate } from 'react-router-dom';
import { Save, Upload, Image as ImageIcon, Trash2, Settings as SettingsIcon, MessageCircle, Plus, Gift, Bell, LogOut, Users, Link as LinkIcon, CheckCircle, AlertCircle, X, Cpu, Database, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessageConfig } from '../types';
import { uploadImageToStorage, deleteImageFromStorage, getDisplayImageUrl } from '../utils/image';
import { ImageCropperModal } from '../components/ImageCropperModal';

const TABS = [
  { id: 'general', label: 'Logo & Hiển thị', icon: ImageIcon },
  { id: 'chat', label: 'Kịch bản Chatbot', icon: MessageCircle },
  { id: 'ai_consultant', label: 'AI Tư Vấn', icon: MessageCircle },
  { id: 'integrations', label: 'Cổng kết nối', icon: Cpu },
  { id: 'wheel', label: 'Vòng quay May mắn', icon: Gift },
  { id: 'partners', label: 'Hệ sinh thái', icon: LinkIcon },
  { id: 'notification', label: 'Thông báo', icon: Bell },
  { id: 'staff', label: 'Truy cập nhân viên', icon: Users },
];

const AdminSettings: React.FC = () => {
  const { settings, updateSettings, isSuperAdmin, isAuthReady, handleLogout } = useApp();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 3000);
  };

  const [logoUrl, setLogoUrl] = useState(settings.brandLogo || '');
  const [opacity, setOpacity] = useState(settings.watermarkOpacity || 0.5);
  const [position, setPosition] = useState(settings.watermarkPosition || 'bottom-right');
  
  const [luckyWheelCTA, setLuckyWheelCTA] = useState(settings.luckyWheelCTA || 'Quay là trúng!');
  const [luckyWheelSubCTA, setLuckyWheelSubCTA] = useState(settings.luckyWheelSubCTA || 'Dâu Rể cùng chơi - May mắn gấp đôi!');
  const [luckyWheelNotificationText, setLuckyWheelNotificationText] = useState(settings.luckyWheelNotificationText || 'Chúc mừng Dâu Rể đã nhận được 1 vòng quay may mắn! 🎁');
  const [luckyWheelNotificationEnabled, setLuckyWheelNotificationEnabled] = useState(settings.luckyWheelNotificationEnabled !== false);
  const [luckyWheelEnabled, setLuckyWheelEnabled] = useState(settings.luckyWheelEnabled !== false);
  
  const [partnerBrand1, setPartnerBrand1] = useState(settings.partnerBrand1 || { name: 'LAMARY BRIDAL', url: '', image: '' });
  const [partnerBrand2, setPartnerBrand2] = useState(settings.partnerBrand2 || { name: 'THUYH2O MAKEUP', url: '', image: '' });
  const [showPartnerBrands, setShowPartnerBrands] = useState(settings.showPartnerBrands !== false);

  const [larkWebhookUrl, setLarkWebhookUrl] = useState(settings.larkWebhookUrl || '');
  const [larkNotificationEnabled, setLarkNotificationEnabled] = useState(settings.larkNotificationEnabled !== false);

  const [telegramBotToken, setTelegramBotToken] = useState(settings.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId || '');
  const [telegramNotificationEnabled, setTelegramNotificationEnabled] = useState(settings.telegramNotificationEnabled === true);

  const [aiConsultantEnabled, setAiConsultantEnabled] = useState(settings.aiConsultantEnabled !== false);
  const [aiConsultantName, setAiConsultantName] = useState(settings.aiConsultantName || 'Trợ lý H2O');
  const [aiConsultantPrompt, setAiConsultantPrompt] = useState(settings.aiConsultantPrompt || 'Bạn là nhân viên tư vấn nhiệt tình của H2O Studio. Hãy tư vấn với giọng điệu chuyên nghiệp, thân thiện, trả lời ngắn gọn và dễ hiểu. Bạn có thể sử dụng biểu tượng cảm xúc.');

  // Integrations states ("Cổng kết nối")
  const [integrationChatApiEnabled, setIntegrationChatApiEnabled] = useState(settings.integrationChatApiEnabled || false);
  const [integrationChatApiUrl, setIntegrationChatApiUrl] = useState(settings.integrationChatApiUrl || '');
  const [integrationChatApiKey, setIntegrationChatApiKey] = useState(settings.integrationChatApiKey || '');
  const [integrationChatApiModelName, setIntegrationChatApiModelName] = useState(settings.integrationChatApiModelName || '');
  const [integrationChatApiHeaders, setIntegrationChatApiHeaders] = useState(settings.integrationChatApiHeaders || '');
  const [integrationSheetEnabled, setIntegrationSheetEnabled] = useState(settings.integrationSheetEnabled || false);
  const [integrationSheetId, setIntegrationSheetId] = useState(settings.integrationSheetId || '');
  const [integrationSheetName, setIntegrationSheetName] = useState(settings.integrationSheetName || '');
  const [integrationSheetApiKey, setIntegrationSheetApiKey] = useState(settings.integrationSheetApiKey || '');
  const [integrationZaloEnabled, setIntegrationZaloEnabled] = useState(settings.integrationZaloEnabled || false);
  const [integrationZaloOaId, setIntegrationZaloOaId] = useState(settings.integrationZaloOaId || '');
  const [integrationZaloAccessToken, setIntegrationZaloAccessToken] = useState(settings.integrationZaloAccessToken || '');
  const [integrationScriptNotes, setIntegrationScriptNotes] = useState(settings.integrationScriptNotes || '');

  const [cropImage, setCropImage] = useState<{ url: string; field: 'partner1' | 'partner2' | 'logo' } | null>(null);

  const [chatEnabled, setChatEnabled] = useState(settings.chatEnabled !== false);
  const [liveChatEnabled, setLiveChatEnabled] = useState(settings.liveChatEnabled !== false);
  const [chatBotEnabled, setChatBotEnabled] = useState(settings.chatBotEnabled === true);
  const [chatBotTier2Enabled, setChatBotTier2Enabled] = useState(settings.chatBotTier2Enabled === true);
  const [chatMessages, setChatMessages] = useState<ChatMessageConfig[]>(
    settings.chatMessages && settings.chatMessages.length > 0 
      ? settings.chatMessages 
      : [
          {
            id: 'msg-1',
            content: settings.welcomeMessage || "Chào bạn nhé!\nBạn hãy xem và chọn concept mình yêu thích bằng cách thả tim album\nSau đó vào Album Yêu Thích chọn Gửi Nhận Báo Giá nhé",
            delaySeconds: 10,
            textColor: '#1a1a1a',
            enabled: true
          },
          {
            id: 'msg-2',
            content: settings.secondWelcomeMessage || "Bạn chọn được concept chưa!\nBạn hãy thả tim concept mình yêu thích\nSau đó vào Album Yêu Thích chọn Gửi Nhận Báo Giá - H2O sẽ nhận tư vấn ngay nhé",
            delaySeconds: 30,
            textColor: '#1a1a1a',
            enabled: true
          }
        ]
  );
  
  const [luckyWheelGifts, setLuckyWheelGifts] = useState(
    settings.luckyWheelGifts && settings.luckyWheelGifts.length === 8
      ? settings.luckyWheelGifts
      : [
          { id: '1', name: 'Voucher bạn thân 500k', isTargetable: true },
          { id: '2', name: '02 ảnh để bàn 20x30', isTargetable: true },
          { id: '3', name: 'Voucher Makeup Mẹ', isTargetable: true },
          { id: '4', name: '01 Vest chú rể', isTargetable: true },
          { id: '5', name: '01 Váy đi bàn', isTargetable: true },
          { id: '6', name: 'Voucher thuê váy 1.000.000đ', isTargetable: true },
          { id: '7', name: '01 bộ kính áp tròng', isTargetable: true },
          { id: '8', name: '01 bộ mỹ ký hoa tai', isTargetable: true },
        ]
  );

  const [staffPhones, setStaffPhones] = useState<string[]>(settings.staffPhones || []);
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // Sync state
  React.useEffect(() => {
    if (settings.brandLogo) setLogoUrl(settings.brandLogo);
    if (settings.watermarkOpacity !== undefined) setOpacity(settings.watermarkOpacity);
    if (settings.watermarkPosition) setPosition(settings.watermarkPosition);
    if (settings.staffPhones) setStaffPhones(settings.staffPhones);
    if (settings.chatEnabled !== undefined) setChatEnabled(settings.chatEnabled);
    if (settings.chatMessages && settings.chatMessages.length > 0) setChatMessages(settings.chatMessages);
    if (settings.luckyWheelEnabled !== undefined) setLuckyWheelEnabled(settings.luckyWheelEnabled);
    if (settings.luckyWheelGifts && settings.luckyWheelGifts.length === 8) setLuckyWheelGifts(settings.luckyWheelGifts);
    if (settings.luckyWheelCTA) setLuckyWheelCTA(settings.luckyWheelCTA);
    if (settings.luckyWheelSubCTA) setLuckyWheelSubCTA(settings.luckyWheelSubCTA);
    if (settings.luckyWheelNotificationText) setLuckyWheelNotificationText(settings.luckyWheelNotificationText);
    if (settings.luckyWheelNotificationEnabled !== undefined) setLuckyWheelNotificationEnabled(settings.luckyWheelNotificationEnabled);
    if (settings.larkWebhookUrl) setLarkWebhookUrl(settings.larkWebhookUrl);
    if (settings.larkNotificationEnabled !== undefined) setLarkNotificationEnabled(settings.larkNotificationEnabled);
    if (settings.telegramBotToken) setTelegramBotToken(settings.telegramBotToken);
    if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);
    if (settings.telegramNotificationEnabled !== undefined) setTelegramNotificationEnabled(settings.telegramNotificationEnabled);
  }, [settings]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-dark/60 font-medium animate-pulse">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) return <Navigate to="/admin/login" />;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showToast('File quá lớn! Vui lòng chọn file dưới 1MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage({ url: reader.result as string, field: 'logo' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePartner1FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showToast('File quá lớn! Vui lòng chọn file dưới 1MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage({ url: reader.result as string, field: 'partner1' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePartner2FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showToast('File quá lớn! Vui lòng chọn file dưới 1MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage({ url: reader.result as string, field: 'partner2' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSection = async (section: string) => {
    setIsSaving(true);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    try {
      let partialSettings: any = {};

      if (section === 'general') {
        let finalLogoUrl = logoUrl;
        if (logoUrl.startsWith('data:image')) {
          try {
            finalLogoUrl = await Promise.race([
              uploadImageToStorage(logoUrl, `settings/brandLogo_${Date.now()}.png`, 'Cấu hình hệ thống'),
              new Promise<string>((_, reject) => setTimeout(() => reject(new Error('IMAGE_UPLOAD_TIMEOUT')), 8000))
            ]);
            
            if (settings.brandLogo && settings.brandLogo !== finalLogoUrl) {
              deleteImageFromStorage(settings.brandLogo).catch(console.error);
            }
          } catch (error) {
            console.error("Error uploading logo:", error);
            if (logoUrl.length > 500000) {
              showToast('Ảnh logo quá lớn để lưu trực tiếp. Vui lòng chọn ảnh dưới 500KB hoặc tải lên một link ảnh (URL).', 'error');
            } else {
              showToast('Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.', 'error');
            }
            setIsSaving(false);
            return; // Dừng lại không lưu tiếp nếu lỗi
          }
        }
        setLogoUrl(finalLogoUrl);
        partialSettings = { brandLogo: finalLogoUrl, watermarkOpacity: opacity, watermarkPosition: position };
      } 
      else if (section === 'chat') {
        partialSettings = { chatEnabled, chatMessages, liveChatEnabled, chatBotEnabled, chatBotTier2Enabled };
      } 
      else if (section === 'ai_consultant') {
        partialSettings = { aiConsultantEnabled, aiConsultantName, aiConsultantPrompt };
      }
      else if (section === 'integrations') {
        partialSettings = { 
          integrationChatApiEnabled, 
          integrationChatApiUrl, 
          integrationChatApiKey, 
          integrationChatApiModelName, 
          integrationChatApiHeaders, 
          integrationSheetEnabled, 
          integrationSheetId, 
          integrationSheetName, 
          integrationSheetApiKey, 
          integrationZaloEnabled,
          integrationZaloOaId,
          integrationZaloAccessToken,
          integrationScriptNotes,
          telegramBotToken,
          telegramChatId,
          telegramNotificationEnabled,
        };
      }
      else if (section === 'wheel') {
        partialSettings = { luckyWheelEnabled, luckyWheelGifts, luckyWheelCTA, luckyWheelSubCTA, luckyWheelNotificationText, luckyWheelNotificationEnabled };
      } 
      else if (section === 'partners') {
        let finalPartner1Image = partnerBrand1.image;
        if (finalPartner1Image.startsWith('data:image')) {
          try {
            finalPartner1Image = await Promise.race([
              uploadImageToStorage(finalPartner1Image, `settings/partner1_${Date.now()}.png`, partnerBrand1.name),
              new Promise<string>((_, reject) => setTimeout(() => reject(new Error('IMAGE_UPLOAD_TIMEOUT')), 8000))
            ]);
            if (settings.partnerBrand1?.image && settings.partnerBrand1.image !== finalPartner1Image) {
              deleteImageFromStorage(settings.partnerBrand1.image).catch(console.error);
            }
          } catch (error) {
            console.error("Error uploading partner 1 image:", error);
            showToast('Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.', 'error');
            setIsSaving(false);
            return;
          }
        }
        
        let finalPartner2Image = partnerBrand2.image;
        if (finalPartner2Image.startsWith('data:image')) {
          try {
            finalPartner2Image = await Promise.race([
              uploadImageToStorage(finalPartner2Image, `settings/partner2_${Date.now()}.png`, partnerBrand2.name),
              new Promise<string>((_, reject) => setTimeout(() => reject(new Error('IMAGE_UPLOAD_TIMEOUT')), 8000))
            ]);
            if (settings.partnerBrand2?.image && settings.partnerBrand2.image !== finalPartner2Image) {
              deleteImageFromStorage(settings.partnerBrand2.image).catch(console.error);
            }
          } catch (error) {
            console.error("Error uploading partner 2 image:", error);
            showToast('Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.', 'error');
            setIsSaving(false);
            return;
          }
        }
        
        const finalPartner1 = { ...partnerBrand1, image: finalPartner1Image };
        const finalPartner2 = { ...partnerBrand2, image: finalPartner2Image };
        setPartnerBrand1(finalPartner1);
        setPartnerBrand2(finalPartner2);
        
        partialSettings = { partnerBrand1: finalPartner1, partnerBrand2: finalPartner2, showPartnerBrands };
      } 
      else if (section === 'notification') {
        partialSettings = { larkWebhookUrl, larkNotificationEnabled, telegramBotToken, telegramChatId, telegramNotificationEnabled };
      } 
      else if (section === 'staff') {
        partialSettings = { staffPhones };
      }

      await Promise.race([
        updateSettings(partialSettings),
        timeoutPromise
      ]);
      
      showToast('Đã lưu cấu hình thành công!', 'success');
    } catch (error: any) {
      console.error("Error saving settings:", error);
      let errorMessage = 'Có lỗi xảy ra khi lưu cấu hình. Vui lòng kiểm tra lại kết nối mạng.';
      
      if (error.message === 'TIMEOUT') {
        errorMessage = 'Quá thời gian yêu cầu. Thử lại sau.';
      } else if (error instanceof Error) {
        try {
          const errInfo = JSON.parse(error.message);
          if (errInfo.error && errInfo.error.includes('Permission denied')) {
            errorMessage = 'Bạn không có quyền thay đổi cấu hình hệ thống.';
          } else {
            errorMessage = `Lỗi hệ thống: ${errInfo.error || error.message}`;
          }
        } catch (e) {
          errorMessage = `Lỗi: ${error.message}`;
        }
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addStaffPhone = () => {
    let phone = newStaffPhone.trim();
    if (phone) {
      const normalizedRaw = phone.replace(/[\s\.\-\(\)]/g, '');
      const toAdd = [normalizedRaw];
      
      if (normalizedRaw.startsWith('0') && normalizedRaw.length >= 10) {
        toAdd.push('+84' + normalizedRaw.slice(1));
      }
      if (normalizedRaw.startsWith('+84')) {
        toAdd.push('0' + normalizedRaw.slice(3));
      }

      const updatedPhones = [...staffPhones];
      toAdd.forEach(p => {
        if (!updatedPhones.includes(p)) {
          updatedPhones.push(p);
        }
      });

      setStaffPhones(updatedPhones);
      setNewStaffPhone('');
    }
  };

  const removeStaffPhone = (phone: string) => {
    setStaffPhones(staffPhones.filter(p => p !== phone));
  };

  const addChatMessage = () => {
    setChatMessages([
      ...chatMessages,
      {
        id: `msg-${Date.now()}`,
        content: '',
        delaySeconds: 30,
        textColor: '#1a1a1a',
        enabled: true
      }
    ]);
  };

  const removeChatMessage = (id: string) => {
    setChatMessages(chatMessages.filter(msg => msg.id !== id));
  };

  const updateChatMessage = (id: string, field: keyof ChatMessageConfig, value: any) => {
    setChatMessages(chatMessages.map(msg => 
      msg.id === id ? { ...msg, [field]: value } : msg
    ));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-dark flex items-center gap-2 mb-2 pb-4 border-b border-light-gray">
              <ImageIcon size={24} className="text-primary" />
              Cấu hình Logo & Watermark
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-dark mb-2">Link Logo (PNG trong suốt)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
                  />
                  <label className="p-3 bg-white border border-light-gray rounded-xl hover:border-primary cursor-pointer transition-colors flex items-center justify-center group" title="Tải ảnh từ máy tính">
                    <Upload size={20} className="text-primary group-hover:scale-110 transition-transform" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                  {logoUrl && (
                    <button 
                      onClick={() => setLogoUrl('')}
                      className="p-3 bg-white border border-light-gray rounded-xl hover:border-red-500 cursor-pointer transition-colors flex items-center justify-center group"
                      title="Xóa logo"
                    >
                      <Trash2 size={20} className="text-red-500 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-dark/40 mt-1 italic">* Khuyên dùng file PNG không nền để hiển thị đẹp nhất. Giới hạn 1MB.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-dark mb-2">Độ mờ logo ({Math.round(opacity * 100)}%)</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-dark mb-2">Vị trí hiển thị</label>
                <select 
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
                >
                  <option value="top-left">Góc trên bên trái</option>
                  <option value="top-center">Giữa trên</option>
                  <option value="top-right">Góc trên bên phải</option>
                  <option value="bottom-left">Góc dưới bên trái</option>
                  <option value="bottom-center">Giữa dưới</option>
                  <option value="bottom-right">Góc dưới bên phải</option>
                  <option value="center">Chính giữa ảnh</option>
                </select>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-light-gray">
              <h3 className="text-sm font-bold text-dark uppercase tracking-widest mb-4 text-center">Xem trước hiển thị</h3>
              <div className="relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[3/4] max-w-sm mx-auto bg-dark rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img 
                  src="https://picsum.photos/seed/h2o/800/1200" 
                  alt="Preview" 
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-[0.2em] pointer-events-none">
                  Ảnh mẫu
                </div>
                
                {logoUrl && (
                  <div className={`absolute inset-0 p-6 flex ${
                    position === 'top-left' ? 'items-start justify-start' :
                    position === 'top-center' ? 'items-start justify-center' :
                    position === 'top-right' ? 'items-start justify-end' :
                    position === 'bottom-left' ? 'items-end justify-start' :
                    position === 'bottom-center' ? 'items-end justify-center' :
                    position === 'center' ? 'items-center justify-center' :
                    'items-end justify-end'
                  }`}>
                    <motion.img 
                      key={`${logoUrl}-${position}-${opacity}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: opacity }}
                      src={getDisplayImageUrl(logoUrl)} 
                      alt="Logo Preview" 
                      className="max-w-[100px] sm:max-w-[120px] h-auto pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="space-y-6 flex flex-col h-full">
            {/* --- 3 toggle controls --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Toggle: Widget CHAT trên website */}
              <div className="bg-light-gray/60 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-dark">Widget CHAT website</p>
                  <p className="text-[11px] text-dark/50 mt-0.5">Hiện/ẩn nút Chat dưới website</p>
                </div>
                <label className="flex flex-col items-center cursor-pointer shrink-0">
                  <span className={`text-[10px] font-bold mb-1 ${liveChatEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {liveChatEnabled ? 'BẬT' : 'TẮT'}
                  </span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={liveChatEnabled} onChange={e => setLiveChatEnabled(e.target.checked)} />
                    <div className={`block w-11 h-6 rounded-full transition-colors ${liveChatEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${liveChatEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>

              {/* Toggle: Bot Tầng 1 — kịch bản */}
              <div className={`rounded-2xl p-4 flex items-center justify-between gap-3 border-2 transition-colors ${chatBotEnabled ? 'bg-primary/5 border-primary/30' : 'bg-light-gray/60 border-transparent'}`}>
                <div>
                  <p className="text-sm font-bold text-dark">Bot Tầng 1 · Kịch bản</p>
                  <p className="text-[11px] text-dark/50 mt-0.5">Khớp từ khóa kho kịch bản · miễn phí</p>
                </div>
                <label className="flex flex-col items-center cursor-pointer shrink-0">
                  <span className={`text-[10px] font-bold mb-1 ${chatBotEnabled ? 'text-primary' : 'text-gray-400'}`}>
                    {chatBotEnabled ? 'BẬT' : 'TẮT'}
                  </span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={chatBotEnabled} onChange={e => setChatBotEnabled(e.target.checked)} />
                    <div className={`block w-11 h-6 rounded-full transition-colors ${chatBotEnabled ? 'bg-primary' : 'bg-gray-300'}`} />
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${chatBotEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>

              {/* Toggle: Bot Tầng 2 — AI API */}
              <div className={`rounded-2xl p-4 flex items-center justify-between gap-3 border-2 transition-colors ${chatBotTier2Enabled ? 'bg-purple-50 border-purple-300' : 'bg-light-gray/60 border-transparent'}`}>
                <div>
                  <p className="text-sm font-bold text-dark">Bot Tầng 2 · AI API</p>
                  <p className="text-[11px] text-dark/50 mt-0.5">Gemini/ChatGPT + kịch bản · cần API</p>
                </div>
                <label className="flex flex-col items-center cursor-pointer shrink-0">
                  <span className={`text-[10px] font-bold mb-1 ${chatBotTier2Enabled ? 'text-purple-600' : 'text-gray-400'}`}>
                    {chatBotTier2Enabled ? 'BẬT' : 'TẮT'}
                  </span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={chatBotTier2Enabled} onChange={e => setChatBotTier2Enabled(e.target.checked)} />
                    <div className={`block w-11 h-6 rounded-full transition-colors ${chatBotTier2Enabled ? 'bg-purple-500' : 'bg-gray-300'}`} />
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${chatBotTier2Enabled ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>
            </div>

            {/* Info box — giải thích 2 tầng bot */}
            {(chatBotEnabled || chatBotTier2Enabled) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[11px] text-blue-800 space-y-1">
                {chatBotEnabled && <p>🤖 <b>Tầng 1</b>: Bot tự khớp từ khóa tin nhắn với kho kịch bản chốt sale, trả lời tức thì, không tốn chi phí API.</p>}
                {chatBotTier2Enabled && <p>✨ <b>Tầng 2</b>: AI đọc toàn bộ kịch bản + lịch sử chat → phản hồi thông minh hơn. Cần cấu hình API tại tab <b>Cổng kết nối</b>. Khi Tầng 2 bật, Tầng 2 được ưu tiên.</p>}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-dark flex items-center gap-2">
                <MessageCircle size={24} className="text-primary" />
                Kịch bản Chatbot
              </h2>
              <label className="flex flex-col items-center cursor-pointer">
                <span className="text-xs text-dark/60 font-medium mb-1">
                  {chatEnabled ? 'Đang Bật' : 'Đang Tắt'}
                </span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={chatEnabled} 
                    onChange={(e) => setChatEnabled(e.target.checked)} 
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${chatEnabled ? 'bg-primary' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${chatEnabled ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
            
            <div className={`flex-1 transition-opacity ${!chatEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-2 pb-4 border-b border-light-gray">
                <p className="text-sm text-dark/70">Thiết lập các tin nhắn chatbot tự động dựa trên thời gian thực tế.</p>
                <button 
                  onClick={addChatMessage}
                  className="text-sm font-bold text-primary flex items-center gap-1 hover:underline bg-primary/10 px-3 py-1.5 rounded-lg whitespace-nowrap"
                >
                  <Plus size={16} /> Thêm tin nhắn
                </button>
              </div>
            
            <div className="space-y-4">
              {chatMessages.map((msg, index) => (
                <div key={msg.id} className={`p-4 rounded-2xl border border-light-gray relative transition-opacity ${msg.enabled === false ? 'opacity-50 bg-gray-50' : 'bg-light-gray/30'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={msg.enabled !== false}
                          onChange={(e) => updateChatMessage(msg.id, 'enabled', e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <label className="block text-sm font-bold text-dark">Tin nhắn {index + 1}</label>
                    </div>
                    <button 
                      onClick={() => removeChatMessage(msg.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Xóa tin nhắn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <textarea 
                      value={msg.content}
                      onChange={(e) => updateChatMessage(msg.id, 'content', e.target.value)}
                      rows={3}
                      placeholder="Nhập nội dung tin nhắn..."
                      className="w-full p-3 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-primary resize-none text-sm"
                    />
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-dark/60 mb-1">Thời gian chờ (giây)</label>
                        <input 
                          type="number" 
                          value={msg.delaySeconds}
                          onChange={(e) => updateChatMessage(msg.id, 'delaySeconds', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full p-2 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-dark/60 mb-1">Màu chữ</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={msg.textColor}
                            onChange={(e) => updateChatMessage(msg.id, 'textColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                          />
                          <span className="text-xs font-mono text-dark/60">{msg.textColor}</span>
                        </div>
                      </div>
                    </div>
                    {index === 0 ? (
                      <p className="text-[10px] text-dark/40 italic">* Thời gian chờ tính từ lúc khách vào web.</p>
                    ) : (
                      <p className="text-[10px] text-dark/40 italic">* Thời gian chờ tính từ lúc tin nhắn trước đó đóng lại.</p>
                    )}
                  </div>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <div className="text-center py-12 bg-light-gray/20 rounded-2xl border border-dashed border-light-gray">
                  <MessageCircle size={32} className="text-dark/20 mb-2 mx-auto" />
                  <p className="text-sm text-dark/40">Chưa có kịch bản tin nhắn nào.</p>
                </div>
              )}
            </div>
            </div>
          </div>
        );

      case 'ai_consultant':
        return (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 border-b border-light-gray pb-4">
              <h2 className="text-xl font-bold text-dark flex items-center gap-2">
                <MessageCircle size={24} className="text-secondary" />
                AI Tư Vấn
              </h2>
              <label className="flex flex-col items-center cursor-pointer">
                <span className="text-xs text-dark/60 font-medium mb-1">
                  {aiConsultantEnabled ? 'Đang Bật' : 'Đang Tắt'}
                </span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={aiConsultantEnabled} 
                    onChange={(e) => setAiConsultantEnabled(e.target.checked)} 
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${aiConsultantEnabled ? 'bg-secondary' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${aiConsultantEnabled ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>

            <div className={`space-y-4 transition-opacity ${!aiConsultantEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="bg-light-gray/20 rounded-2xl p-5 border border-light-gray">
                <h3 className="font-bold text-dark mb-4 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> 
                  Thông tin cơ bản
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">Tên Trợ lý AI</label>
                    <input 
                      type="text" 
                      value={aiConsultantName} 
                      onChange={(e) => setAiConsultantName(e.target.value)}
                      placeholder="VD: Trợ lý H2O, Phương Anh, Chuyên viên Tâm Đan..."
                      className="w-full p-3 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary transition-colors text-sm"
                    />
                    <p className="text-xs text-dark/40 mt-1">Tên này sẽ hiển thị ở khung chat với khách hàng.</p>
                  </div>
                </div>
              </div>

              <div className="bg-cyan-50/50 rounded-2xl p-5 border border-cyan-100 pb-12">
                <h3 className="font-bold text-cyan-900 mb-4 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span> 
                  Kịch bản/Vai trò của AI (Prompt)
                </h3>
                <div>
                  <textarea 
                    value={aiConsultantPrompt}
                    onChange={(e) => setAiConsultantPrompt(e.target.value)}
                    rows={12}
                    placeholder="Nhập vai trò, kiến thức tư vấn nghiệp vụ ngành cưới cho AI..."
                    className="w-full p-4 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:border-cyan-500 resize-y text-sm leading-relaxed"
                  />
                  <div className="mt-3 bg-white p-4 rounded-xl border border-cyan-100 space-y-2">
                    <p className="text-sm font-bold text-cyan-900">Gợi ý cách viết Prompt:</p>
                    <ul className="text-xs text-cyan-800 list-disc list-inside space-y-1">
                      <li>Định hình vai trò: "Bạn là {aiConsultantName}, chuyên viên tư vấn cao cấp của H2O Studio."</li>
                      <li>Khung kịch bản: Cung cấp thông tin giá cả, ví dụ: "Gói basic giá 5tr, VIP 10tr...".</li>
                      <li>Giới hạn tư vấn: "Chỉ tư vấn các thông tin nằm trong kịch bản. Nếu khách hỏi nằm ngoài chuyên môn, hãy khéo léo xin số điện thoại để quản lý liên hệ lại."</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6 flex flex-col h-full overflow-y-auto pb-10">
            <div className="flex items-center justify-between mb-2 border-b border-light-gray pb-4">
              <h2 className="text-xl font-bold text-dark flex items-center gap-2">
                <Cpu size={24} className="text-secondary" />
                Cổng Kết Nối Đa Kênh & APIs
              </h2>
              <span className="text-xs bg-secondary/10 text-secondary px-3 py-1 rounded-full font-semibold">
                Bảo mật & Mã hóa
              </span>
            </div>

            {/* 1. API Chat Ngoại Vi */}
            <div className="bg-light-gray/20 rounded-2xl p-5 border border-light-gray space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-dark text-sm flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-orange-100 text-orange-600"><Globe size={16} /></span>
                  Tự cấu hình API Chat (OpenAI, DeepSeek, Custom LLM)
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <span className="sr-only">Kích hoạt Chat API</span>
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={integrationChatApiEnabled} 
                    onChange={(e) => setIntegrationChatApiEnabled(e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>
              
              {integrationChatApiEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-dark/70 mb-1">API Endpoint URL</label>
                    <input 
                      type="text" 
                      value={integrationChatApiUrl} 
                      onChange={(e) => setIntegrationChatApiUrl(e.target.value)}
                      placeholder="VD: https://api.deepseek.com/v1/chat/completions hoặc URL API tự dựng"
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark/70 mb-1">API Key / Token</label>
                    <input 
                      type="password" 
                      value={integrationChatApiKey} 
                      onChange={(e) => setIntegrationChatApiKey(e.target.value)}
                      placeholder="Nhập API Key của nền tảng..."
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark/70 mb-1">Model Name</label>
                    <input 
                      type="text" 
                      value={integrationChatApiModelName} 
                      onChange={(e) => setIntegrationChatApiModelName(e.target.value)}
                      placeholder="VD: deepseek-chat, gpt-4o-mini"
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-dark/70 mb-1">Custom Headers (Định dạng JSON - Tùy chọn)</label>
                    <textarea 
                      value={integrationChatApiHeaders} 
                      onChange={(e) => setIntegrationChatApiHeaders(e.target.value)}
                      placeholder='VD: { "Custom-Header": "Giá trị" }'
                      rows={2}
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Google Sheet Script Connection */}
            <div className="bg-light-gray/20 rounded-2xl p-5 border border-light-gray space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-dark text-sm flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-green-100 text-green-600"><Database size={16} /></span>
                  Đồng bộ Dữ liệu Cưới từ Google Sheet FAQs
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <span className="sr-only">Kích hoạt Sheet</span>
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={integrationSheetEnabled} 
                    onChange={(e) => setIntegrationSheetEnabled(e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>

              {integrationSheetEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-dark/70 mb-1">Google Spreadsheet ID</label>
                    <input 
                      type="text" 
                      value={integrationSheetId} 
                      onChange={(e) => setIntegrationSheetId(e.target.value)}
                      placeholder="Nhập ID từ URL của tài liệu Google Sheet..."
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm font-mono"
                    />
                    <p className="text-[11px] text-dark/50 mt-1">
                      ID là chuỗi ký tự nằm giữa `/d/` và `/edit` trong thanh địa chỉ link Sheet của bạn.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark/70 mb-1">Tên Sheet dữ liệu</label>
                    <input 
                      type="text" 
                      value={integrationSheetName} 
                      onChange={(e) => setIntegrationSheetName(e.target.value)}
                      placeholder="VD: KichBan, FAQs, Gói dịch vụ"
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark/70 mb-1">API Key của Google (Nếu có)</label>
                    <input 
                      type="password" 
                      value={integrationSheetApiKey} 
                      onChange={(e) => setIntegrationSheetApiKey(e.target.value)}
                      placeholder="Nhập Google API Key để đọc Sheet bảo mật..."
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Notification Integration Status */}
            <div className="bg-light-gray/20 rounded-2xl p-5 border border-light-gray space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-dark text-sm flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-100 text-blue-600"><Bell size={16} /></span>
                    Thông báo khách mới (Lark / Telegram)
                  </h3>
                  <p className="text-xs text-dark/50 mt-1">
                    Bắn thông báo khách hàng cần tư vấn, đã chọn concept hoặc trúng thưởng.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${settings.larkWebhookUrl && settings.larkNotificationEnabled !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    Lark {settings.larkWebhookUrl && settings.larkNotificationEnabled !== false ? '✓' : '—'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${settings.telegramNotificationEnabled && settings.telegramBotToken ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    Telegram {settings.telegramNotificationEnabled && settings.telegramBotToken ? '✓' : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Zalo OA Connection */}
            <div className="bg-light-gray/20 rounded-2xl p-5 border border-light-gray space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-dark text-sm flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-indigo-100 text-indigo-600"><MessageCircle size={16} /></span>
                  Tích hợp Zalo Official Account (Zalo OA)
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <span className="sr-only">Kích hoạt Zalo OA</span>
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={integrationZaloEnabled} 
                    onChange={(e) => setIntegrationZaloEnabled(e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>

              {integrationZaloEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-dark/70 mb-1">Zalo OA ID</label>
                    <input 
                      type="text" 
                      value={integrationZaloOaId} 
                      onChange={(e) => setIntegrationZaloOaId(e.target.value)}
                      placeholder="VD: 345672938456..."
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark/70 mb-1">Zalo OA Access Token</label>
                    <input 
                      type="password" 
                      value={integrationZaloAccessToken} 
                      onChange={(e) => setIntegrationZaloAccessToken(e.target.value)}
                      placeholder="Nhập Access Token được sinh ra từ Zalo Developer..."
                      className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Ghi chú kịch bản / tài liệu lưu sẵn */}
            <div className="bg-light-gray/20 rounded-2xl p-5 border border-light-gray space-y-3 pb-8">
              <h3 className="font-bold text-dark text-sm flex items-center gap-2">
                <span className="p-1 rounded-lg bg-teal-100 text-teal-600"><Save size={16} /></span>
                Tài liệu & Kịch bản Tư vấn Lưu Trữ Sẵn (FAQ Offline)
              </h3>
              <p className="text-xs text-dark/50">
                Nhập các câu hỏi thường gặp, gói giá dịch vụ chụp ảnh để AI bổ sung thêm vào bộ não lúc tư vấn offline khi không kết nối được Google Sheet.
              </p>
              <textarea 
                value={integrationScriptNotes} 
                onChange={(e) => setIntegrationScriptNotes(e.target.value)}
                placeholder="Ví dụ:&#10;Gói Chụp Studio: 5.900.000đ gồm 2 váy cưới, 1 album 30x30, 1 ảnh cổng.&#10;Địa điểm chụp: Phim trường H2O hoặc studio trong nhà.&#10;Cách chăm sóc khách: Luôn hỏi cưới ngày nào, thích tone màu ấm hay trong trẻo..."
                rows={6}
                className="w-full p-3 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-secondary text-sm"
              />
            </div>

            {/* Telegram Bot Notification */}
            <div className="bg-sky-50/60 rounded-2xl p-5 border border-sky-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-dark text-sm flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-sky-100 text-sky-600"><Bell size={16} /></span>
                  Thông báo Telegram Bot
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={telegramNotificationEnabled} onChange={(e) => setTelegramNotificationEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
              <p className="text-xs text-dark/50">Bắn thông báo khách mới về nhóm Telegram — có tên, SĐT và link album yêu thích.</p>
              <div className={`space-y-3 transition-opacity ${!telegramNotificationEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-xs font-bold text-dark/70 mb-1">Bot Token</label>
                  <input
                    type="text"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-sky-400 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark/70 mb-1">Chat ID (nhóm/channel)</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="-100xxxxxxxxxx"
                    className="w-full p-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-sky-400 text-sm font-mono"
                  />
                </div>
                <p className="text-xs text-dark/50">
                  Tạo bot qua @BotFather → lấy Token. Thêm bot vào nhóm → lấy Chat ID tại: api.telegram.org/bot<b>TOKEN</b>/getUpdates
                </p>
              </div>
            </div>
          </div>
        );

      case 'wheel':
        return (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-dark flex items-center gap-2">
                <Gift size={24} className="text-primary" />
                Vòng Quay May Mắn
              </h2>
              <label className="flex flex-col items-center cursor-pointer">
                <span className="text-xs text-dark/60 font-medium mb-1">
                  {luckyWheelEnabled ? 'Đang Bật' : 'Đang Tắt'}
                </span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={luckyWheelEnabled} 
                    onChange={(e) => setLuckyWheelEnabled(e.target.checked)} 
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${luckyWheelEnabled ? 'bg-primary' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${luckyWheelEnabled ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
            
            <div className={`grid grid-cols-1 gap-4 transition-opacity ${!luckyWheelEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="pb-4 border-b border-light-gray">
                <p className="text-sm text-dark/70">Cấu hình vòng quay may mắn trên trang chủ hoặc popup.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-dark/60 mb-1 uppercase tracking-wider">Call to Action (Chính)</label>
                <input 
                  type="text" 
                  value={luckyWheelCTA}
                  onChange={(e) => setLuckyWheelCTA(e.target.value)}
                  className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm"
                  placeholder="VD: Quay là trúng!"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark/60 mb-1 uppercase tracking-wider">Call to Action (Phụ)</label>
                <input 
                  type="text" 
                  value={luckyWheelSubCTA}
                  onChange={(e) => setLuckyWheelSubCTA(e.target.value)}
                  className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm"
                  placeholder="VD: Dâu Rể cùng chơi - May mắn gấp đôi!"
                />
              </div>
              <div className="pt-2 border-t border-light-gray/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-dark/60 uppercase tracking-wider">Thông báo nổi sau 10s</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={luckyWheelNotificationEnabled}
                      onChange={(e) => setLuckyWheelNotificationEnabled(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <input 
                  type="text" 
                  value={luckyWheelNotificationText}
                  onChange={(e) => setLuckyWheelNotificationText(e.target.value)}
                  disabled={!luckyWheelNotificationEnabled}
                  className={`w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm ${!luckyWheelNotificationEnabled ? 'opacity-50' : ''}`}
                  placeholder="VD: Chúc mừng Dâu Rể đã nhận được quà! 🎁"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-light-gray/50">
              <h3 className="text-sm font-bold text-dark uppercase tracking-widest mb-2">Quản lý Quà Tặng (8 Ô)</h3>
              <p className="text-xs text-dark/60 mb-4">
                Bật nút xanh để quà tặng có thể được quay trúng. Quà tắt đi vẫn hiển thị nhưng tỉ lệ trúng = 0%.
              </p>
              
              <div className="space-y-3">
                {luckyWheelGifts.map((gift, index) => (
                  <div key={gift.id} className="flex items-center gap-3 p-3 bg-light-gray/30 rounded-xl border border-light-gray">
                    <span className="text-sm font-bold text-dark/40 w-6">{index + 1}.</span>
                    <input 
                      type="text" 
                      value={gift.name}
                      onChange={(e) => {
                        const newGifts = [...luckyWheelGifts];
                        newGifts[index].name = e.target.value;
                        setLuckyWheelGifts(newGifts);
                      }}
                      className="flex-1 p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary text-sm"
                      placeholder="Tên phần quà..."
                    />
                    <label className="relative inline-flex items-center cursor-pointer" title={gift.isTargetable ? "Đang bật (Có thể trúng)" : "Đang tắt (Không thể trúng)"}>
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={gift.isTargetable}
                        onChange={(e) => {
                          const newGifts = [...luckyWheelGifts];
                          newGifts[index].isTargetable = e.target.checked;
                          setLuckyWheelGifts(newGifts);
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'partners':
        return (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 pb-4 border-b border-light-gray">
              <h2 className="text-xl font-bold text-dark flex items-center gap-2">
                <LinkIcon size={24} className="text-primary" />
                Quảng cáo Hệ sinh thái
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={showPartnerBrands}
                  onChange={(e) => setShowPartnerBrands(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-2 text-sm font-bold text-dark">{showPartnerBrands ? 'Bật hiển thị' : 'Tắt'}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 bg-light-gray/20 p-5 rounded-2xl border border-light-gray relative">
                {!showPartnerBrands && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 rounded-2xl"></div>}
                <h3 className="font-bold text-sm text-dark border-b border-light-gray/50 pb-2">Thương hiệu 1</h3>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Tên thương hiệu</label>
                  <input 
                    type="text" 
                    value={partnerBrand1.name}
                    onChange={(e) => setPartnerBrand1(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Đường dẫn Web App (URL)</label>
                  <input 
                    type="url" 
                    value={partnerBrand1.url}
                    onChange={(e) => setPartnerBrand1(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Ảnh đại diện (Link URL hoặc Tải lên)</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="url" 
                      value={partnerBrand1.image}
                      onChange={(e) => setPartnerBrand1(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="https://..."
                      className="flex-1 text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                    />
                    <label className="p-2 bg-white border border-light-gray rounded-lg hover:border-primary cursor-pointer transition-colors flex items-center justify-center group" title="Tải ảnh từ máy tính">
                      <Upload size={18} className="text-primary group-hover:scale-110 transition-transform" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePartner1FileChange}
                      />
                    </label>
                    {partnerBrand1.image && (
                      <button 
                        onClick={() => setPartnerBrand1(prev => ({ ...prev, image: '' }))}
                        className="p-2 bg-white border border-light-gray rounded-lg hover:border-red-500 cursor-pointer transition-colors flex items-center justify-center group"
                        title="Xóa ảnh"
                      >
                        <Trash2 size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Dòng chữ thu hút (Call to action)</label>
                  <input 
                    type="text" 
                    value={partnerBrand1.ctaText || ''}
                    onChange={(e) => setPartnerBrand1(prev => ({ ...prev, ctaText: e.target.value }))}
                    placeholder="VD: Tham khảo mẫu váy mới nhất!"
                    className="w-full text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                {partnerBrand1.image && (
                  <div className="pt-2 flex justify-center">
                    <img src={getDisplayImageUrl(partnerBrand1.image)} referrerPolicy="no-referrer" alt="Preview 1" className="h-16 w-16 object-cover rounded-full shadow-md border-2 border-primary" />
                  </div>
                )}
              </div>

              <div className="space-y-4 bg-light-gray/20 p-5 rounded-2xl border border-light-gray relative">
                {!showPartnerBrands && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 rounded-2xl"></div>}
                <h3 className="font-bold text-sm text-dark border-b border-light-gray/50 pb-2">Thương hiệu 2</h3>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Tên thương hiệu</label>
                  <input 
                    type="text" 
                    value={partnerBrand2.name}
                    onChange={(e) => setPartnerBrand2(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Đường dẫn Web App (URL)</label>
                  <input 
                    type="url" 
                    value={partnerBrand2.url}
                    onChange={(e) => setPartnerBrand2(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Ảnh đại diện (Link URL hoặc Tải lên)</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="url" 
                      value={partnerBrand2.image}
                      onChange={(e) => setPartnerBrand2(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="https://..."
                      className="flex-1 text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                    />
                    <label className="p-2 bg-white border border-light-gray rounded-lg hover:border-primary cursor-pointer transition-colors flex items-center justify-center group" title="Tải ảnh từ máy tính">
                      <Upload size={18} className="text-primary group-hover:scale-110 transition-transform" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePartner2FileChange}
                      />
                    </label>
                    {partnerBrand2.image && (
                      <button 
                        onClick={() => setPartnerBrand2(prev => ({ ...prev, image: '' }))}
                        className="p-2 bg-white border border-light-gray rounded-lg hover:border-red-500 cursor-pointer transition-colors flex items-center justify-center group"
                        title="Xóa ảnh"
                      >
                        <Trash2 size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">Dòng chữ thu hút (Call to action)</label>
                  <input 
                    type="text" 
                    value={partnerBrand2.ctaText || ''}
                    onChange={(e) => setPartnerBrand2(prev => ({ ...prev, ctaText: e.target.value }))}
                    placeholder="VD: Tham khảo layout makeup!"
                    className="w-full text-sm p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                {partnerBrand2.image && (
                  <div className="pt-2 flex justify-center">
                    <img src={getDisplayImageUrl(partnerBrand2.image)} referrerPolicy="no-referrer" alt="Preview 2" className="h-16 w-16 object-cover rounded-full shadow-md border-2 border-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'notification':
        return (
          <div className="space-y-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-dark flex items-center gap-2 mb-2 pb-4 border-b border-light-gray">
              <Bell size={24} className="text-primary" />
              Thông báo khách mới
            </h2>
            <p className="text-sm text-dark/60 bg-light-gray/30 p-4 rounded-xl border border-light-gray/50">
              Mỗi khi có khách đăng ký, hệ thống bắn thông báo đến Lark và/hoặc Telegram cùng lúc. Có thể bật cả hai.
            </p>

            {/* ── Lark ── */}
            <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-black text-blue-700 uppercase tracking-wider">Lark (Feishu)</span>
              </div>
              <label className="flex items-center justify-between p-3 bg-white border border-light-gray rounded-xl cursor-pointer hover:border-primary transition-colors">
                <span className="font-bold text-dark text-sm">Kích hoạt thông báo Lark</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={larkNotificationEnabled} onChange={(e) => setLarkNotificationEnabled(e.target.checked)} />
                  <div className={`block w-12 h-7 rounded-full transition-colors ${larkNotificationEnabled ? 'bg-primary' : 'bg-gray-200'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${larkNotificationEnabled ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
              <div className={`transition-opacity ${!larkNotificationEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-bold text-dark mb-2">Lark Webhook URL</label>
                <input
                  type="text"
                  value={larkWebhookUrl}
                  onChange={(e) => setLarkWebhookUrl(e.target.value)}
                  placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
                  className="w-full p-3 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm font-mono"
                />
                <p className="text-xs text-dark/60 mt-2">
                  <span className="text-primary font-bold">* </span>
                  Nhóm Lark → Settings → Bots → Add Custom Bot → Copy Webhook URL.
                </p>
              </div>
            </div>

            {/* ── Telegram ── */}
            <div className="space-y-4 p-4 bg-sky-50/50 border border-sky-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-black text-sky-700 uppercase tracking-wider">Telegram Bot</span>
              </div>
              <label className="flex items-center justify-between p-3 bg-white border border-light-gray rounded-xl cursor-pointer hover:border-sky-400 transition-colors">
                <span className="font-bold text-dark text-sm">Kích hoạt thông báo Telegram</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={telegramNotificationEnabled} onChange={(e) => setTelegramNotificationEnabled(e.target.checked)} />
                  <div className={`block w-12 h-7 rounded-full transition-colors ${telegramNotificationEnabled ? 'bg-sky-500' : 'bg-gray-200'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${telegramNotificationEnabled ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
              <div className={`space-y-3 transition-opacity ${!telegramNotificationEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-sm font-bold text-dark mb-2">Bot Token</label>
                  <input
                    type="text"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="123456789:AAF..."
                    className="w-full p-3 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-sky-400 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-dark mb-2">Chat ID (nhóm hoặc channel)</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="-100xxxxxxxxxx"
                    className="w-full p-3 bg-white border border-light-gray rounded-xl focus:outline-none focus:border-sky-400 text-sm font-mono"
                  />
                </div>
                <p className="text-xs text-dark/60">
                  <span className="text-sky-600 font-bold">* </span>
                  Tạo bot qua @BotFather → lấy Token. Thêm bot vào nhóm/channel → lấy Chat ID qua @userinfobot hoặc Telegram API.
                </p>
              </div>
            </div>
          </div>
        );

      case 'staff':
        return (
          <div className="space-y-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-dark flex items-center gap-2 mb-2 pb-4 border-b border-light-gray">
              <Users size={24} className="text-primary" />
              Truy cập nhân viên nội bộ
            </h2>
            <p className="text-sm text-dark/60 bg-light-gray/30 p-4 rounded-xl border border-light-gray/50">
              Nhân viên đăng nhập bằng số điện thoại có trong danh sách này sẽ có quyền truy cập vào giao diện quản trị Admin để tải lên Album mới hoặc ẩn/hiện Album.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <input 
                type="tel" 
                value={newStaffPhone}
                onChange={(e) => setNewStaffPhone(e.target.value)}
                placeholder="Nhập số điện thoại (VD: 0987...)"
                className="flex-1 p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary font-mono"
                onKeyPress={(e) => e.key === 'Enter' && addStaffPhone()}
              />
              <button 
                onClick={addStaffPhone}
                className="w-full sm:w-auto px-6 py-3 bg-dark text-white font-bold rounded-xl hover:bg-dark/90 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Thêm SĐT
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {staffPhones.map((phone) => (
                <div key={phone} className="flex items-center justify-between p-4 bg-white rounded-xl border border-light-gray hover:border-primary/30 transition-colors">
                  <span className="font-mono text-dark font-medium">{phone}</span>
                  <button 
                    onClick={() => removeStaffPhone(phone)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Xóa nhân viên"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {staffPhones.length === 0 && (
                <div className="text-center py-12 bg-light-gray/20 rounded-2xl border border-dashed border-light-gray">
                  <Users size={32} className="text-dark/20 mb-2 mx-auto" />
                  <p className="text-sm text-dark/40">Chưa có số điện thoại nhân viên nào được cấu hình.</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title="Cấu hình hệ thống" showBack>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 min-w-[300px] max-w-[90vw] rounded-xl shadow-xl flex items-center justify-between gap-3 ${
              toast.type === 'success' 
                ? 'bg-green-100 border border-green-200 text-green-800' 
                : 'bg-red-100 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
              <p className="font-medium text-sm leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity p-1">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark flex items-center gap-3">
              <SettingsIcon className="text-primary w-8 h-8" />
              Cấu hình Hệ thống
            </h1>
            <p className="text-dark/60 mt-2">Quản lý giao diện, thông báo, tích hợp và quyền truy cập nhân viên.</p>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLogout();
            }}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all border border-red-100 flex items-center gap-2 shadow-sm"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2 relative z-10">
            <div className="bg-white rounded-2xl shadow-sm border border-light-gray overflow-hidden sticky top-24">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-5 py-4 flex items-center gap-3 font-medium transition-all border-l-4 ${
                    activeTab === tab.id 
                      ? 'bg-primary/5 text-primary border-primary' 
                      : 'text-dark/70 hover:bg-light-gray/30 border-transparent hover:text-dark'
                  }`}
                >
                  <tab.icon size={20} className={activeTab === tab.id ? 'text-primary' : 'text-dark/40'} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 w-full min-w-0">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-light-gray min-h-[500px] flex flex-col">
              
              {/* Form Content */}
              <div className="flex-1">
                {renderTabContent()}
              </div>

              {/* Action Bar */}
              <div className="mt-8 pt-6 border-t border-light-gray">
                <button 
                  onClick={() => handleSaveSection(activeTab)}
                  disabled={isSaving}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Save size={20} />
                  {isSaving ? 'Đang lưu...' : `Lưu cài đặt ${TABS.find(t => t.id === activeTab)?.label}`}
                </button>
              </div>
              
            </div>
          </div>
        </div>
      </div>
      {cropImage && (
        <ImageCropperModal
          image={cropImage.url}
          circularCrop={cropImage.field !== 'logo'}
          aspectRatio={1}
          onCancel={() => setCropImage(null)}
          onCropComplete={(croppedUrl) => {
            if (cropImage.field === 'logo') setLogoUrl(croppedUrl);
            else if (cropImage.field === 'partner1') setPartnerBrand1(prev => ({ ...prev, image: croppedUrl }));
            else if (cropImage.field === 'partner2') setPartnerBrand2(prev => ({ ...prev, image: croppedUrl }));
            setCropImage(null);
          }}
        />
      )}
    </Layout>
  );
};

export default AdminSettings;
