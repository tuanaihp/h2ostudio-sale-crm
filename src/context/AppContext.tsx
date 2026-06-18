import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Consultation, Style, Album, Photo, EditorState, ChatMessageConfig, LuckyGift, AppSettings } from '../types';
import { STYLES as MOCK_STYLES } from '../data/mockData';
import { uploadImageToStorage, deleteImageFromStorage } from '../utils/image';
import {
  db, auth, loginWithGoogle, logout, onAuthStateChanged, User,
} from '../firebase';
import { GOOGLE_SCRIPT_URL, LARK_FALLBACK_URL } from '../utils/config';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, 
  getDocs, getDoc, writeBatch, serverTimestamp, Timestamp
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (errMessage.includes('offline') || errMessage.includes('insufficient permissions')) {
    console.warn("Possible Firebase Configuration Issue: Database might not be created or Rules are blocking access.");
  }

  throw new Error(errMessage);
}

interface AppContextType {
  styles: Style[];
  setStyles: React.Dispatch<React.SetStateAction<Style[]>>;
  isDataLoaded: boolean;
  user: User | null;
  isAuthReady: boolean;
  login: () => Promise<void>;
  handleLogout: () => Promise<void>;
  addStyle: (editorState: EditorState) => Promise<void>;
  addAlbum: (styleSlug: string, editorState: EditorState) => Promise<void>;
  addPhoto: (styleSlug: string, albumSlug: string, editorState: EditorState) => Promise<void>;
  deleteStyle: (styleId: string) => Promise<void>;
  deleteAlbum: (styleSlug: string, albumId: string) => Promise<void>;
  deletePhoto: (styleSlug: string, albumSlug: string, photoId: string) => Promise<void>;
  restoreStyle: (styleId: string) => Promise<void>;
  restoreAlbum: (styleSlug: string, albumId: string) => Promise<void>;
  restorePhoto: (styleSlug: string, albumSlug: string, photoId: string) => Promise<void>;
  permanentDeleteStyle: (styleId: string) => Promise<void>;
  permanentDeleteAlbum: (styleSlug: string, albumId: string) => Promise<void>;
  permanentDeletePhoto: (styleSlug: string, albumSlug: string, photoId: string) => Promise<void>;
  updatePhoto: (styleSlug: string, albumSlug: string, photoId: string, image: string) => Promise<void>;
  updateAlbumCover: (styleSlug: string, albumSlug: string, coverImage: string) => Promise<void>;
  updateStyleCover: (styleId: string, coverImage: string) => Promise<void>;
  updateAlbumCoverPos: (styleSlug: string, albumSlug: string, pos: { x: number; y: number }) => Promise<void>;
  updateAlbumText: (styleSlug: string, albumSlug: string, field: 'title' | 'description' | 'suggestedLayout' | 'suitableFor' | 'displayLikes', value: string) => Promise<void>;
  updateStyleText: (styleSlug: string, field: 'title' | 'description', value: string) => Promise<void>;
  reorderStyles: (newStyles: Style[]) => Promise<void>;
  reorderAlbums: (styleId: string, newAlbums: Album[]) => Promise<void>;
  reorderPhotos: (styleId: string, albumId: string, newPhotos: Photo[]) => Promise<void>;
  moveStyle: (styleId: string, direction: 'prev' | 'next') => Promise<void>;
  moveAlbum: (styleId: string, albumId: string, direction: 'prev' | 'next') => Promise<void>;
  movePhoto: (styleId: string, albumId: string, photoId: string, direction: 'prev' | 'next') => Promise<void>;
  submitConsultation: (data: { name: string; phone: string; email?: string; message?: string; date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string }) => Promise<void>;
  consultations: Consultation[];
  updateConsultationStatus: (id: string, status: 'new' | 'contacted' | 'registered') => Promise<void>;
  updateConsultationRegistration: (id: string, data: Partial<Consultation>) => Promise<void>;
  updateConsultationNotes: (id: string, notes: string) => Promise<void>;
  updateConsultationTags: (id: string, tags: string[]) => Promise<void>;
  updateConsultationField: (id: string, field: string, value: any) => Promise<void>;
  deleteConsultation: (id: string) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userPhone: string | null;
  setUserPhone: (phone: string, name?: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  fetchAlbums: (styleId: string) => Promise<void>;
  fetchPhotos: (styleId: string, albumId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [styles, setStyles] = useState<Style[]>([]);
  const stylesRef = useRef<Style[]>([]);
  const requestedAlbumsRef = useRef<Set<string>>(new Set());
  const requestedPhotosRef = useRef<Set<string>>(new Set());
  const albumUnsubscribesRef = useRef<Map<string, () => void>>(new Map());
  const photoUnsubscribesRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    stylesRef.current = styles;
  }, [styles]);

  useEffect(() => {
    return () => {
      albumUnsubscribesRef.current.forEach(unsub => unsub());
      photoUnsubscribesRef.current.forEach(unsub => unsub());
    };
  }, []);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    staffPhones: ['0899252393', '0973685994', '0363234909']
  });
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const authReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Safety fallback: If auth state tracking takes more than 3 seconds,
    // we set isAuthReady to true anyway to avoid blocking the UI forever.
    authReadyTimeoutRef.current = setTimeout(() => {
      setIsAuthReady(true);
    }, 3000);

    return () => {
      if (authReadyTimeoutRef.current) clearTimeout(authReadyTimeoutRef.current);
    };
  }, []);
  const [userPhone, setUserPhoneState] = useState<string | null>(() => {
    return localStorage.getItem('h2o_user_phone');
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('h2o_favorites');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('h2o_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const setUserPhone = (phone: string, customerName?: string) => {
    localStorage.setItem('h2o_user_phone', phone);
    setUserPhoneState(phone);
    
    // Automatically create a "Visitor" lead
    submitConsultation({
      name: customerName || `Khách mới (${phone})`,
      phone: phone,
      message: "Khách hàng vượt qua màn hình đăng ký xem ảnh (PhoneGate) và cung cấp thông tin để trải nghiệm."
    }).catch(console.error);
  };

  const allStaffPhones = useMemo(() => [
    '0899252393', '0973685994', '0363234909',
    '+84899252393', '+84973685994', '+84363234909',
    ...(settings?.staffPhones || [])
  ], [settings?.staffPhones]);

  const checkPhoneInWhitelist = useCallback((p: string | null | undefined): boolean => {
    if (!p) return false;
    const normalizedRaw = p.replace(/[\s.\-()]/g, '');
    const normalizedNoVN = normalizedRaw.startsWith('+84') ? '0' + normalizedRaw.slice(3) : normalizedRaw;
    const normalizedWithVN = normalizedRaw.startsWith('0') ? '+84' + normalizedRaw.slice(1) : normalizedRaw;
    return allStaffPhones.includes(normalizedRaw) ||
           allStaffPhones.includes(normalizedNoVN) ||
           allStaffPhones.includes(normalizedWithVN);
  }, [allStaffPhones]);

  const isSuperAdmin = useMemo(() =>
    userRole === 'super_admin' ||
    userRole === 'supper_admin' ||
    checkPhoneInWhitelist(userPhone) ||
    checkPhoneInWhitelist(user?.phoneNumber),
  [userRole, userPhone, user?.phoneNumber, checkPhoneInWhitelist]);

  const isAdmin = useMemo(() =>
    isSuperAdmin ||
    userRole === 'admin' ||
    userRole === 'staff' ||
    checkPhoneInWhitelist(userPhone) ||
    checkPhoneInWhitelist(user?.phoneNumber),
  [isSuperAdmin, userRole, userPhone, user?.phoneNumber, checkPhoneInWhitelist]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserRole(null);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // User Role listener
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role);
      } else {
        // Auto-provisioning first admin/staff accounts
        const isDefaultAdmin = (user.email === "maxsamuelbldhp@gmail.com") || 
                               (user.email === "nguyentuan@hps.edu.vn") ||
                               checkPhoneInWhitelist(user.phoneNumber);
        const isDefaultStaff = (user.email === "staff@h2ostudio.com");
        
        if (isDefaultAdmin || isDefaultStaff) {
          const role = isDefaultAdmin ? 'super_admin' : 'admin';
          setUserRole(role);
          try {
            await setDoc(userDocRef, {
              email: user.email || '',
              phoneNumber: user.phoneNumber || '',
              role: role,
              displayName: user.displayName || (isDefaultStaff ? 'H2O Staff' : (isDefaultAdmin ? 'Admin Principal' : 'Admin')),
              createdAt: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            console.warn("Could not auto-create role doc:", err);
          }
        } else {
          setUserRole('client');
        }
      }
      setIsAuthReady(true);
    }, (error: any) => {
      console.warn("Error listening to user doc:", error);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [user]);

  // Settings listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      }
    }, (error) => {
      // Quietly log settings error to avoid confusion, it will use defaults
      console.warn("Settings could not be loaded, using defaults. Error:", error.message);
    });
    return () => unsubscribe();
  }, []);

  const forceSeed = () => {
    seedInitialData();
  };
  
  // Make forceSeed available on window for emergency debug
  useEffect(() => {
    (window as any).forceSeed = forceSeed;
  }, [user]);

  const moveStyle = async (currentIndex: number, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    
    let updatedStyles: Style[] | null = null;

    setStyles(prev => {
      if (currentIndex < 0 || currentIndex >= prev.length) return prev;

      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newStyles = [...prev];
      const temp = newStyles[currentIndex];
      newStyles[currentIndex] = newStyles[newIndex];
      newStyles[newIndex] = temp;
      
      updatedStyles = newStyles;
      return newStyles;
    });

    if (updatedStyles) {
      try {
        await reorderStyles(updatedStyles);
      } catch (err) {
        console.error("Move style failed:", err);
      }
    }
  };

  const moveAlbum = async (styleId: string, currentIndex: number, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    
    let updatedAlbums: Album[] | null = null;
    let success = false;

    setStyles(prev => {
      const styleIndex = prev.findIndex(s => s.id === styleId);
      if (styleIndex === -1) return prev;
      
      const style = prev[styleIndex];
      const albums = style.albums || [];
      if (albums.length === 0) return prev;

      if (currentIndex < 0 || currentIndex >= albums.length) return prev;

      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= albums.length) return prev;

      const newAlbums = [...albums];
      const temp = newAlbums[currentIndex];
      newAlbums[currentIndex] = newAlbums[newIndex];
      newAlbums[newIndex] = temp;
      
      updatedAlbums = newAlbums;
      success = true;

      const newStyles = [...prev];
      newStyles[styleIndex] = { ...style, albums: newAlbums };
      return newStyles;
    });

    if (success && updatedAlbums) {
      try {
        await reorderAlbums(styleId, updatedAlbums);
      } catch (err) {
        console.error("Move album failed, state might be inconsistent:", err);
        // We could refresh data here if needed
      }
    }
  };

  const movePhoto = async (styleId: string, albumId: string, currentIndex: number, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    
    let updatedPhotos: Photo[] | null = null;

    setStyles(prev => {
      const styleIndex = prev.findIndex(s => s.id === styleId);
      if (styleIndex === -1) return prev;
      
      const style = prev[styleIndex];
      const albumIndex = (style.albums || []).findIndex(a => a.id === albumId);
      if (albumIndex === -1) return prev;
      
      const album = style.albums![albumIndex];
      if (!album.photos || album.photos.length === 0) return prev;

      if (currentIndex < 0 || currentIndex >= album.photos.length) return prev;

      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= album.photos.length) return prev;

      const newPhotos = [...album.photos];
      const temp = newPhotos[currentIndex];
      newPhotos[currentIndex] = newPhotos[newIndex];
      newPhotos[newIndex] = temp;
      
      updatedPhotos = newPhotos;

      const newAlbums = [...style.albums!];
      newAlbums[albumIndex] = { ...album, photos: newPhotos };

      const newStyles = [...prev];
      newStyles[styleIndex] = { ...style, albums: newAlbums };
      return newStyles;
    });

    if (updatedPhotos) {
      try {
        await reorderPhotos(styleId, albumId, updatedPhotos);
      } catch (err) {
        console.error("Move photo failed:", err);
      }
    }
  };

  const fetchAlbums = async (styleId: string) => {
    if (requestedAlbumsRef.current.has(styleId)) return;
    requestedAlbumsRef.current.add(styleId);

    const q = query(collection(db, 'styles', styleId, 'albums'), orderBy('order', 'asc'));

    return new Promise<void>((resolve, reject) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const albumsData = snapshot.docs.map(d => ({
          ...d.data() as Album,
          id: d.id
        })).filter(a => !a.deleted);

        setStyles(prev => prev.map(s => {
          if (s.id !== styleId) return s;
          const mergedAlbums = albumsData.map(newAlbum => {
            const existingAlbum = (s.albums || []).find(a => a.id === newAlbum.id);
            const photos = (existingAlbum?.photos && existingAlbum.photos.length > 0)
              ? existingAlbum.photos
              : (newAlbum.photos || []);
            return { ...newAlbum, photos };
          });
          return { ...s, albums: mergedAlbums };
        }));
        resolve();
      }, (error) => {
        console.error("Error fetching albums real-time:", error);
        requestedAlbumsRef.current.delete(styleId);
        albumUnsubscribesRef.current.delete(styleId);
        reject(error);
      });

      albumUnsubscribesRef.current.set(styleId, unsubscribe);
    });
  };

  const fetchPhotos = async (styleId: string, albumId: string) => {
    const key = `${styleId}_${albumId}`;
    if (requestedPhotosRef.current.has(key)) return;
    requestedPhotosRef.current.add(key);

    const photosQuery = query(
      collection(db, 'styles', styleId, 'albums', albumId, 'photos'),
      orderBy('order', 'asc')
    );

    return new Promise<void>((resolve, reject) => {
      const unsubscribe = onSnapshot(photosQuery, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const photosData = snapshot.docs.map(d => ({
          ...d.data() as Photo,
          id: d.id
        })).filter(p => !p.deleted);

        setStyles(prev => prev.map(s => {
          if (s.id !== styleId) return s;
          return {
            ...s,
            albums: (s.albums || []).map(a =>
              a.id === albumId ? { ...a, photos: photosData } : a
            )
          };
        }));
        resolve();
      }, (error) => {
        console.error("Error fetching photos real-time:", error);
        requestedPhotosRef.current.delete(key);
        photoUnsubscribesRef.current.delete(key);
        reject(error);
      });

      photoUnsubscribesRef.current.set(key, unsubscribe);
    });
  };

  // Firestore listener
  useEffect(() => {
    if (!isAuthReady) return;

    const stylesCollectionRef = collection(db, 'styles');
    const q = query(stylesCollectionRef, orderBy('order', 'asc'));

    const unsubscribeStyles = onSnapshot(q, (snapshot) => {
      // Prevent Firebase local cache glitches from wiping data during batch updates
      if (snapshot.metadata.hasPendingWrites) {
        console.warn("Ignoring styles snapshot with pending writes to prevent UI wipe.");
        return;
      }

      if (snapshot.empty && isAdmin && isDataLoaded) {
        setStyles(prev => {
          if (prev.length === 0) seedInitialData();
          return prev;
        });
        return;
      }

      setStyles(prevStyles => {
        // If snapshot is empty, don't wipe everything immediately if we already have data
        if (snapshot.empty && prevStyles.length > 0) return prevStyles;

        return snapshot.docs.map(styleDoc => {
          const styleData = styleDoc.data() as Style;
          const id = styleDoc.id;
          
          const existingStyle = prevStyles.find(s => s.id === id);
          
          // CRITICAL: Preserve existing sub-collections data (albums)
          // Since styles collection doesn't contain the albums array, we MUST keep what we have in state
          const albums = (existingStyle?.albums && existingStyle.albums.length > 0) 
            ? existingStyle.albums 
            : (styleData.albums || []);

          return {
            ...styleData,
            id,
            albums
          };
        }).filter(s => !s.deleted);
      });
      setIsDataLoaded(true);
    }, (error) => {
      console.warn("Public access restricted or database empty:", error.message);
      setIsDataLoaded(true);
    });

    return () => unsubscribeStyles();
  }, [isAuthReady, isAdmin]); // Only depend on auth state. Functional state updates handle the rest

  const seedInitialData = async () => {
    if (!user) return;
    
    try {
      const batch = writeBatch(db);
      
      for (const style of MOCK_STYLES) {
        const styleRef = doc(db, 'styles', style.id);
        const { albums, ...styleData } = style;
        batch.set(styleRef, { ...styleData, createdAt: serverTimestamp() });
        
        for (const album of albums) {
          const albumRef = doc(db, 'styles', style.id, 'albums', album.id);
          const { photos, ...albumData } = album;
          batch.set(albumRef, { ...albumData, createdAt: serverTimestamp() });
          
          for (const photo of photos) {
            const photoRef = doc(db, 'styles', style.id, 'albums', album.id, 'photos', photo.id);
            batch.set(photoRef, { ...photo, createdAt: serverTimestamp() });
          }
        }
      }
      
      await batch.commit();
    } catch (error: any) {
      const errMsg = typeof error === 'string' ? error : (error?.message || '');
      if (error?.code === 'permission-denied' || errMsg.toLowerCase().includes('permission')) {
        console.warn("Lỗi phân quyền khi nạp dữ liệu. Bỏ qua.");
      } else {
        console.error("Error seeding data:", error);
      }
    }
  };

  // Fetch consultations (Admin only)
  useEffect(() => {
    if (!isAuthReady || !isAdmin) return;

    const q = query(collection(db, 'consultations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const consultsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Consultation[];
      setConsultations(consultsData);
    }, (error: any) => {
      if (error.code === 'permission-denied') {
         console.warn('Consultations: Permission denied (expected if rules are locked to older schema).');
      } else {
         handleFirestoreError(error, OperationType.GET, 'consultations');
      }
    });

    return () => unsubscribe();
  }, [isAuthReady, isAdmin]);

  const touchStyle = async (styleId: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'styles', styleId), {
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error touching style:", error);
    }
  };

  const addStyle = async (state: EditorState) => {
    if (!user || !isAdmin) return;
    const id = `style-${Date.now()}`;
    const slug = `new-style-${Date.now()}`;
    const path = `styles/${id}`;
    const order = styles.length;
    
    try {
      const uploadedState = { ...state };
      if (uploadedState.mainImage) {
        uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${id}/mainImage.jpg`, uploadedState.text);
      }
      if (uploadedState.logo1) {
        uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${id}/logo1.png`, uploadedState.text);
      }
      if (uploadedState.logo2) {
        uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${id}/logo2.png`, uploadedState.text);
      }

      // Optimistic update
      const newStyle: Style = {
        id,
        slug,
        title: uploadedState.text || "Phong cách mới",
        description: "Phong cách được thiết kế riêng",
        coverImage: uploadedState.mainImage || "https://picsum.photos/seed/new/600/900",
        design: uploadedState,
        order,
        albums: []
      };
      setStyles(prev => [...prev, newStyle]);

      await setDoc(doc(db, 'styles', id), {
        id,
        slug,
        title: newStyle.title,
        description: newStyle.description,
        coverImage: newStyle.coverImage,
        design: uploadedState,
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Rollback on error
      setStyles(styles);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const addAlbum = async (styleSlug: string, state: EditorState) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    
    const id = `album-${Date.now()}`;
    const slug = `new-album-${Date.now()}`;
    const path = `styles/${style.id}/albums/${id}`;
    const order = style.albums?.length || 0;
    
    try {
      const uploadedState = { ...state };
      if (uploadedState.mainImage) {
        uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${style.id}/albums/${id}/mainImage.jpg`, uploadedState.text);
      }
      if (uploadedState.logo1) {
        uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${style.id}/albums/${id}/logo1.png`, uploadedState.text);
      }
      if (uploadedState.logo2) {
        uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${style.id}/albums/${id}/logo2.png`, uploadedState.text);
      }

      // Optimistic update
      const newAlbum: Album = {
        id,
        slug,
        title: uploadedState.text || "Album mới",
        description: "Concept được thiết kế riêng",
        coverImage: uploadedState.mainImage || "https://picsum.photos/seed/new-album/600/900",
        design: uploadedState,
        order,
        photos: []
      };
      setStyles(prev => prev.map(s => s.id === style.id ? { ...s, albums: [...(s.albums || []), newAlbum] } : s));

      await setDoc(doc(db, 'styles', style.id, 'albums', id), {
        id,
        slug,
        title: newAlbum.title,
        description: newAlbum.description,
        coverImage: newAlbum.coverImage,
        design: uploadedState,
        order,
        createdAt: serverTimestamp()
      });
      await touchStyle(style.id);
    } catch (error) {
      setStyles(styles);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const addPhoto = async (styleSlug: string, albumSlug: string, state: EditorState) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    
    const id = `photo-${Date.now()}`;
    const path = `styles/${style.id}/albums/${album.id}/photos/${id}`;
    const order = album.photos?.length || 0;
    
    try {
      const uploadedState = { ...state };
      if (uploadedState.mainImage) {
        uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${style.id}/albums/${album.id}/photos/${id}/mainImage.jpg`, album.title);
      }
      if (uploadedState.logo1) {
        uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${style.id}/albums/${album.id}/photos/${id}/logo1.png`, album.title);
      }
      if (uploadedState.logo2) {
        uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${style.id}/albums/${album.id}/photos/${id}/logo2.png`, album.title);
      }

      // Optimistic update
      const newPhoto: Photo = {
        id,
        image: uploadedState.mainImage || "https://picsum.photos/seed/new-photo/800/1200",
        alt: uploadedState.text || "Ảnh mới",
        design: uploadedState,
        order
      };
      setStyles(prevStyles => prevStyles.map(s => s.id === style.id ? {
        ...s,
        albums: s.albums.map(a => a.id === album.id ? { ...a, photos: [...(a.photos || []), newPhoto] } : a)
      } : s));

      await setDoc(doc(db, 'styles', style.id, 'albums', album.id, 'photos', id), {
        id,
        image: newPhoto.image,
        alt: newPhoto.alt,
        design: uploadedState,
        order,
        createdAt: serverTimestamp()
      });
      await touchStyle(style.id);
    } catch (error) {
      setStyles(styles);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteStyle = async (styleId: string) => {
    if (!user || !isAdmin) return;
    const path = `styles/${styleId}`;
    
    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.filter(s => s.id !== styleId));

    try {
      await updateDoc(doc(db, 'styles', styleId), { deleted: true, deletedAt: serverTimestamp() });
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const restoreStyle = async (styleId: string) => {
    if (!user || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'styles', styleId), { deleted: false });
    } catch (error) {
      console.error('Failed to restore:', error);
    }
  };

  const permanentDeleteStyle = async (styleId: string) => {
    if (!user || !isAdmin) return;
    const path = `styles/${styleId}`;
    
    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.filter(s => s.id !== styleId));

    try {
      const styleToDelete = styles.find(s => s.id === styleId);
      if (styleToDelete?.coverImage) {
        deleteImageFromStorage(styleToDelete.coverImage).catch(console.error);
      }
      if (styleToDelete?.design) {
        if (styleToDelete.design.mainImage) deleteImageFromStorage(styleToDelete.design.mainImage).catch(console.error);
        if (styleToDelete.design.logo1) deleteImageFromStorage(styleToDelete.design.logo1).catch(console.error);
        if (styleToDelete.design.logo2) deleteImageFromStorage(styleToDelete.design.logo2).catch(console.error);
      }

      // We should recursively delete all albums and their photos
      if (styleToDelete?.albums) {
        for (const album of styleToDelete.albums) {
          if (album.coverImage) {
            deleteImageFromStorage(album.coverImage).catch(console.error);
          }
          if (album.design) {
            if (album.design.mainImage) deleteImageFromStorage(album.design.mainImage).catch(console.error);
            if (album.design.logo1) deleteImageFromStorage(album.design.logo1).catch(console.error);
            if (album.design.logo2) deleteImageFromStorage(album.design.logo2).catch(console.error);
          }
          
          try {
            const photosRef = collection(db, 'styles', styleId, 'albums', album.id, 'photos');
            const photosSnap = await getDocs(photosRef);
            const batch = writeBatch(db);
            photosSnap.forEach(pDoc => {
              const pData = pDoc.data() as Photo;
              if (pData.image) {
                deleteImageFromStorage(pData.image).catch(console.error);
              }
              if (pData.design) {
                if (pData.design.mainImage) deleteImageFromStorage(pData.design.mainImage).catch(console.error);
                if (pData.design.logo1) deleteImageFromStorage(pData.design.logo1).catch(console.error);
                if (pData.design.logo2) deleteImageFromStorage(pData.design.logo2).catch(console.error);
              }
              batch.delete(pDoc.ref);
            });
            batch.delete(doc(db, 'styles', styleId, 'albums', album.id));
            await batch.commit();
          } catch (e) {
            console.error("Failed to delete subcollections for album:", e);
          }
        }
      }

      await deleteDoc(doc(db, 'styles', styleId));
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const deleteAlbum = async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    const path = `styles/${style.id}/albums/${albumId}`;

    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, albums: (s.albums || []).filter(a => a.id !== albumId) } : s));

    try {
      await updateDoc(doc(db, 'styles', style.id, 'albums', albumId), { deleted: true, deletedAt: serverTimestamp() });
      await touchStyle(style.id);
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const restoreAlbum = async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    try {
      await updateDoc(doc(db, 'styles', style.id, 'albums', albumId), { deleted: false });
    } catch (error) {
      console.error('Failed to restore:', error);
    }
  };

  const permanentDeleteAlbum = async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    const path = `styles/${style.id}/albums/${albumId}`;

    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, albums: (s.albums || []).filter(a => a.id !== albumId) } : s));

    try {
      const albumToDelete = style.albums?.find(a => a.id === albumId);
      if (albumToDelete?.coverImage) {
        deleteImageFromStorage(albumToDelete.coverImage).catch(console.error);
      }
      if (albumToDelete?.design) {
        if (albumToDelete.design.mainImage) deleteImageFromStorage(albumToDelete.design.mainImage).catch(console.error);
        if (albumToDelete.design.logo1) deleteImageFromStorage(albumToDelete.design.logo1).catch(console.error);
        if (albumToDelete.design.logo2) deleteImageFromStorage(albumToDelete.design.logo2).catch(console.error);
      }
      
      // Delete all photos in the subcollection and their images from Drive
      const photosRef = collection(db, 'styles', style.id, 'albums', albumId, 'photos');
      const photosSnap = await getDocs(photosRef);
      const batch = writeBatch(db);
      photosSnap.forEach(pDoc => {
        const pData = pDoc.data() as Photo;
        if (pData.image) {
          deleteImageFromStorage(pData.image).catch(console.error);
        }
        if (pData.design) {
          if (pData.design.mainImage) deleteImageFromStorage(pData.design.mainImage).catch(console.error);
          if (pData.design.logo1) deleteImageFromStorage(pData.design.logo1).catch(console.error);
          if (pData.design.logo2) deleteImageFromStorage(pData.design.logo2).catch(console.error);
        }
        batch.delete(pDoc.ref); // Delete doc from Firestore
      });
      batch.delete(doc(db, 'styles', style.id, 'albums', albumId)); // Delete album doc itself
      await batch.commit();

      await touchStyle(style.id);
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const deletePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const path = `styles/${style.id}/albums/${album.id}/photos/${photoId}`;

    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s,
      albums: (s.albums || []).map(a => a.id === album.id ? { ...a, photos: (a.photos || []).filter(p => p.id !== photoId) } : a)
    } : s));

    try {
      await updateDoc(doc(db, 'styles', style.id, 'albums', album.id, 'photos', photoId), { deleted: true, deletedAt: serverTimestamp() });
      await touchStyle(style.id);
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const restorePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    try {
      await updateDoc(doc(db, 'styles', style.id, 'albums', album.id, 'photos', photoId), { deleted: false });
    } catch (error) {
      console.error('Failed to restore:', error);
    }
  };

  const permanentDeletePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const path = `styles/${style.id}/albums/${album.id}/photos/${photoId}`;

    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s,
      albums: (s.albums || []).map(a => a.id === album.id ? { ...a, photos: (a.photos || []).filter(p => p.id !== photoId) } : a)
    } : s));

    try {
      const photoToDelete = (album.photos || []).find(p => p.id === photoId);
      if (photoToDelete?.image) {
        deleteImageFromStorage(photoToDelete.image).catch(console.error);
      }
      if (photoToDelete?.design) {
        if (photoToDelete.design.mainImage) deleteImageFromStorage(photoToDelete.design.mainImage).catch(console.error);
        if (photoToDelete.design.logo1) deleteImageFromStorage(photoToDelete.design.logo1).catch(console.error);
        if (photoToDelete.design.logo2) deleteImageFromStorage(photoToDelete.design.logo2).catch(console.error);
      }
      
      await deleteDoc(doc(db, 'styles', style.id, 'albums', album.id, 'photos', photoId));
      await touchStyle(style.id);
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const updatePhoto = async (styleSlug: string, albumSlug: string, photoId: string, base64OrUrlImage: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const path = `styles/${style.id}/albums/${album.id}/photos/${photoId}`;

    // Optimistic update using base64 or URL
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s,
      albums: (s.albums || []).map(a => a.id === album.id ? {
        ...a,
        photos: (a.photos || []).map(p => p.id === photoId ? { ...p, image: base64OrUrlImage, design: undefined } : p)
      } : a)
    } : s));

    try {
      let finalImageUrl = base64OrUrlImage;
      if (base64OrUrlImage.startsWith('data:image')) {
        finalImageUrl = await uploadImageToStorage(base64OrUrlImage, `styles/${style.id}/albums/${album.id}/photos/${photoId}/mainImage.jpg`, album.title);
        
        // Delete old images if we uploaded a new one
        const oldPhoto = album.photos?.find(p => p.id === photoId);
        if (oldPhoto?.image) {
          deleteImageFromStorage(oldPhoto.image).catch(console.error);
        }
        if (oldPhoto?.design) {
          if (oldPhoto.design.mainImage && oldPhoto.design.mainImage !== oldPhoto.image) deleteImageFromStorage(oldPhoto.design.mainImage).catch(console.error);
          if (oldPhoto.design.logo1) deleteImageFromStorage(oldPhoto.design.logo1).catch(console.error);
          if (oldPhoto.design.logo2) deleteImageFromStorage(oldPhoto.design.logo2).catch(console.error);
        }
      }

      await updateDoc(doc(db, 'styles', style.id, 'albums', album.id, 'photos', photoId), { 
        image: finalImageUrl, 
        design: null 
      });
      await touchStyle(style.id);
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateAlbumCover = async (styleSlug: string, albumSlug: string, coverImage: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const path = `styles/${style.id}/albums/${album.id}`;

    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s,
      albums: (s.albums || []).map(a => a.id === album.id ? { ...a, coverImage, design: undefined } : a)
    } : s));

    try {
      if (album.coverImage && coverImage !== album.coverImage) {
        deleteImageFromStorage(album.coverImage).catch(console.error);
      }
      if (album.design) {
        if (album.design.mainImage && album.design.mainImage !== album.coverImage && album.design.mainImage !== coverImage) deleteImageFromStorage(album.design.mainImage).catch(console.error);
        if (album.design.logo1) deleteImageFromStorage(album.design.logo1).catch(console.error);
        if (album.design.logo2) deleteImageFromStorage(album.design.logo2).catch(console.error);
      }
      await updateDoc(doc(db, 'styles', style.id, 'albums', album.id), { coverImage, design: null });
      await touchStyle(style.id);
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateStyleCover = async (styleId: string, coverImage: string) => {
    if (!user || !isAdmin) return;
    const path = `styles/${styleId}`;

    // Optimistic update
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === styleId ? { ...s, coverImage, design: undefined } : s));

    try {
      const style = styles.find(s => s.id === styleId);
      if (style?.coverImage && coverImage !== style.coverImage) {
        deleteImageFromStorage(style.coverImage).catch(console.error);
      }
      if (style?.design) {
        // Only delete mainImage if it wasn't already deleted by the coverImage check above (often they are the same)
        if (style.design.mainImage && style.design.mainImage !== style.coverImage && style.design.mainImage !== coverImage) deleteImageFromStorage(style.design.mainImage).catch(console.error);
        if (style.design.logo1) deleteImageFromStorage(style.design.logo1).catch(console.error);
        if (style.design.logo2) deleteImageFromStorage(style.design.logo2).catch(console.error);
      }
      await updateDoc(doc(db, 'styles', styleId), { coverImage, design: null, updatedAt: serverTimestamp() });
    } catch (error) {
      setStyles(oldStyles);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateAlbumCoverPos = async (styleSlug: string, albumSlug: string, pos: { x: number; y: number }) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const path = `styles/${style.id}/albums/${album.id}`;

    // Optimistic update
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s,
      albums: (s.albums || []).map(a => a.id === album.id ? { ...a, coverImagePos: pos } : a)
    } : s));

    try {
      await updateDoc(doc(db, 'styles', style.id, 'albums', album.id), { coverImagePos: pos });
      await touchStyle(style.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateAlbumText = async (styleSlug: string, albumSlug: string, field: 'title' | 'description' | 'suggestedLayout' | 'suitableFor' | 'displayLikes', value: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const path = `styles/${style.id}/albums/${album.id}`;

    // Optimistic update
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s,
      albums: (s.albums || []).map(a => a.id === album.id ? { ...a, [field]: value } : a)
    } : s));

    try {
      await updateDoc(doc(db, 'styles', style.id, 'albums', album.id), { [field]: value });
      await touchStyle(style.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateStyleText = async (styleSlug: string, field: 'title' | 'description', value: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    const path = `styles/${style.id}`;

    // Optimistic update
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, [field]: value } : s));

    try {
      await updateDoc(doc(db, 'styles', style.id), { [field]: value, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const reorderStyles = async (newStyles: Style[]) => {
    if (!user || !isAdmin) return;
    try {
      const batch = writeBatch(db);
      newStyles.forEach((style, index) => {
        const styleRef = doc(db, 'styles', style.id);
        batch.update(styleRef, { order: index });
      });
      await batch.commit();
      
      // Touch a random style or the first one to trigger potential listeners if necessary, 
      // although sub-collections are the main focus.
      if (newStyles.length > 0) {
        await touchStyle(newStyles[0].id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'styles');
    }
  };

  const reorderAlbums = async (styleId: string, newAlbums: Album[]) => {
    if (!user || !isAdmin) return;
    try {
      const batch = writeBatch(db);
      newAlbums.forEach((album, index) => {
        const albumRef = doc(db, 'styles', styleId, 'albums', album.id);
        batch.update(albumRef, { order: index });
      });
      await batch.commit();
      await touchStyle(styleId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `styles/${styleId}/albums`);
    }
  };

  const reorderPhotos = async (styleId: string, albumId: string, newPhotos: Photo[]) => {
    if (!user || !isAdmin) return;
    try {
      const batch = writeBatch(db);
      newPhotos.forEach((photo, index) => {
        const photoRef = doc(db, 'styles', styleId, 'albums', albumId, 'photos', photo.id);
        batch.update(photoRef, { order: index });
      });
      await batch.commit();
      await touchStyle(styleId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `styles/${styleId}/albums/${albumId}/photos`);
    }
  };

  const submitConsultation = async (data: { name: string; phone: string; email?: string; message?: string; date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string }) => {
    const id = `consult-${Date.now()}`;
    
    // Clean up payload: remove undefined values and add required fields
    const payload: any = {
      id,
      name: data.name,
      phone: data.phone,
      status: 'new',
      createdAt: serverTimestamp()
    };

    if (data.email) payload.email = data.email.trim();
    if (data.message) payload.message = data.message.trim();
    if (data.source) payload.source = data.source;
    if (data.luckyGift) payload.luckyGift = data.luckyGift;
    if (data.favoriteIds && data.favoriteIds.length > 0) payload.favoriteIds = data.favoriteIds;
    if (data.date) {
      try {
        payload.date = typeof data.date === 'string' ? data.date : data.date.toISOString();
      } catch (e) {
        console.warn("Invalid date in consultation:", data.date);
      }
    }
    
    try {
      await setDoc(doc(db, 'consultations', id), payload);

      const larkUrl = settings?.larkWebhookUrl || LARK_FALLBACK_URL;

      fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'lead',
            leadData: {
              id: payload.id,
              name: data.name,
              phone: data.phone,
              email: data.email || '',
              message: (() => {
                let msg = data.message || '';
                const links = msg.match(/(https?:\/\/[^\s\n]+)/g) || [];
                links.forEach(l => msg = msg.replace(l, ''));
                msg = msg.replace(/Link danh sách:/g, '').replace(/Link:/g, '').trim();
                return msg.split('\n').map(line => line.trim()).filter(line => line.length > 0 && line !== '-').join('\n');
              })(),
              referenceLinks: (data.message?.match(/(https?:\/\/[^\s\n]+)/g) || []).join(', '),
              source: data.source || '',
              luckyGift: data.luckyGift || '',
              date: new Date().toLocaleString('vi-VN')
            },
            larkConfig: { url: larkUrl }
          })
        }).catch(err => console.error("Error syncing lead to Google Sheets:", err));

    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, `consultations/${id}`);
    }
  };

  const syncLeadUpdateToSheets = (id: string, updateData: any) => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update_lead', leadId: id, updateData })
    }).catch(err => console.error("Error syncing lead update to Google Sheets:", err));
  };

  const updateConsultationStatus = async (id: string, status: 'new' | 'contacted' | 'registered') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'consultations', id), { status });
      syncLeadUpdateToSheets(id, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const updateConsultationRegistration = async (id: string, data: Partial<Consultation>) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'consultations', id), { ...data, status: 'registered' });
      syncLeadUpdateToSheets(id, { ...data, status: 'registered' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const updateConsultationNotes = async (id: string, notes: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'consultations', id), { notes });
      syncLeadUpdateToSheets(id, { notes });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const updateConsultationTags = async (id: string, tags: string[]) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'consultations', id), { tags });
      syncLeadUpdateToSheets(id, { tags: tags.join(', ') }); // send as comma-separated string
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const updateConsultationField = async (id: string, field: string, value: any) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'consultations', id), { [field]: value });
      syncLeadUpdateToSheets(id, { [field]: Array.isArray(value) ? value.join(', ') : value });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const deleteConsultation = async (id: string) => {
    if (!isSuperAdmin) return;
    try {
      await deleteDoc(doc(db, 'consultations', id));

      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete_lead', leadId: id })
      }).catch(err => console.error("Error syncing lead deletion to Google Sheets:", err));

    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `consultations/${id}`);
    }
  };

  const login = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('h2o_user_phone');
      setUserPhoneState(null);
      // Force reload to home page to clear all internal app states
      window.location.href = '/';
    } catch (error) {
      console.error("Logout failed:", error);
      // Standard logout might fail if offline, but we should still try to clear local state
      localStorage.removeItem('h2o_user_phone');
      setUserPhoneState(null);
      window.location.href = '/';
    }
  };

  return (
    <AppContext.Provider value={{ 
      styles, setStyles, isDataLoaded, user, isAuthReady, login, handleLogout,
      addStyle, addAlbum, addPhoto, deleteStyle, restoreStyle, permanentDeleteStyle,
      deleteAlbum, restoreAlbum, permanentDeleteAlbum, deletePhoto, restorePhoto, permanentDeletePhoto, updatePhoto, updateAlbumCover, updateStyleCover, updateAlbumCoverPos, updateAlbumText, updateStyleText,
      reorderStyles, reorderAlbums, reorderPhotos,
      moveStyle, moveAlbum, movePhoto,
      submitConsultation, consultations, updateConsultationStatus, updateConsultationRegistration, updateConsultationNotes, updateConsultationTags, updateConsultationField, deleteConsultation, isAdmin, isSuperAdmin,
      userPhone, setUserPhone,
      favorites, toggleFavorite,
      settings,
      fetchAlbums, fetchPhotos,
      updateSettings: async (newSettings: any) => {
        try {
          await setDoc(doc(db, 'settings', 'global'), newSettings, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'settings/global');
        }
      }
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
