import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import { CheckCircle, Code, Shield, User, Key, ArrowLeft, Ticket, Copy, Headset, Send, Clock, Sparkles, RefreshCw, AlertTriangle, Crown, Plus, Trash2, Ban, Play } from 'lucide-react';
import {
  ADMIN_PASSWORD,
  PERMANENT_CODE,
  SAFE_APPLE_IMG,
  ROTTEN_APPLE_IMG,
  ROW_CONFIG,
  JOKER_LOGO_IMG,
  FALLBACK_SAFE_APPLE_SVG,
  FALLBACK_ROTTEN_APPLE_SVG,
  FALLBACK_JOKER_LOGO_SVG,
  generateStrongCode,
  generateRandomGrid
} from './constants';
import {
  db,
  USERS_PATH,
  GRID_PATH,
  BANNED_PATH,
  PREDICTIONS_PATH,
  generateM11Predictions,
  saveM11PredictionsToFirebase,
  listenToFirebaseM11Predictions,
  listenToFirebaseGrid,
  saveGridToFirebase,
  listenToFirebaseUsers,
  listenToFirebaseBanned
} from './firebase';
import { ref, update, set, remove } from 'firebase/database';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>('splash');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false);
  
  // User online counter simulation
  const [onlineCount, setOnlineCount] = useState<number>(353);

  // Auth Inputs
  const [loginId, setLoginId] = useState<string>('');
  const [loginKey, setLoginKey] = useState<string>('');

  // Active User session
  const [userId, setUserId] = useState<string>('');
  const [userDurationMinutes, setUserDurationMinutes] = useState<number>(0);
  const [remainingTimeSeconds, setRemainingTimeSeconds] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Manual Start Game state (Require user to click 'Start Game' before predictor activates)
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  // Firebase m11 Predictions Data & Grid Data
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [gridData, setGridData] = useState<Record<string, string>>(() => generateRandomGrid());
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Helper function to check if cell is safe according to m11 predictions
  const isSafeApple = (rowIdx: number, colIdx: number) => {
    if (!predictions || Object.keys(predictions).length === 0) return false;
    const mIndex = rowIdx * 5 + colIdx + 1;
    const mKey = `m${mIndex}`;
    const mObj = predictions[mKey];

    if (mObj && typeof mObj === 'object' && mObj[mKey] === '1') {
      return true;
    }
    if (mObj === '1' || predictions[mKey] === '1') {
      return true;
    }
    return false;
  };

  // Firebase Realtime Admin Data
  const [firebaseUsers, setFirebaseUsers] = useState<Record<string, any>>({});
  const [firebaseBanned, setFirebaseBanned] = useState<Record<string, boolean>>({});

  const [genUnit, setGenUnit] = useState<string>('forever');
  const [genValue, setGenValue] = useState<number>(1);
  const [genCount, setGenCount] = useState<number>(1);
  const [generatedCodesOutput, setGeneratedCodesOutput] = useState<string[]>([]);

  const [newCodeInput, setNewCodeInput] = useState<string>('');
  const [newCodeUnit, setNewCodeUnit] = useState<string>('hours');
  const [newCodeValue, setNewCodeValue] = useState<number>(1);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // 1. Firebase Listeners Initialization
  useEffect(() => {
    const unsubscribePredictions = listenToFirebaseM11Predictions((data) => {
      if (data) {
        setPredictions(data);
      }
    });

    const unsubscribeGrid = listenToFirebaseGrid((data) => {
      if (data) {
        setGridData(data);
      }
    });

    const unsubscribeUsers = listenToFirebaseUsers((data) => {
      if (data) {
        setFirebaseUsers(data);
      } else {
        setFirebaseUsers({});
      }
    });

    const unsubscribeBanned = listenToFirebaseBanned((data) => {
      if (data) {
        setFirebaseBanned(data);
      } else {
        setFirebaseBanned({});
      }
    });

    return () => {
      if (typeof unsubscribePredictions === 'function') unsubscribePredictions();
      if (typeof unsubscribeGrid === 'function') unsubscribeGrid();
      if (typeof unsubscribeUsers === 'function') unsubscribeUsers();
      if (typeof unsubscribeBanned === 'function') unsubscribeBanned();
    };
  }, []);

  // 2. Initial Splash Screen loading animation (3 seconds)
  useEffect(() => {
    let timer: any;
    const interval = 50;
    const totalDuration = 3000;
    const step = 100 / (totalDuration / interval);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev + step >= 100) {
          clearInterval(progressInterval);
          setLoadingComplete(true);
          
          timer = setTimeout(() => {
            setViewState('login');
          }, 800);

          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      clearInterval(progressInterval);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // 3. Online users counter update loop
  useEffect(() => {
    const userInterval = setInterval(() => {
      setOnlineCount((prev) => {
        const change = Math.floor(Math.random() * 21) - 10;
        let newCount = prev + change;
        if (newCount < 99) newCount = 120;
        if (newCount > 999) newCount = 850;
        return newCount;
      });
    }, 3500);
    return () => clearInterval(userInterval);
  }, []);

  // 4. Game Timer countdown loop (only runs when game is started)
  useEffect(() => {
    if (viewState !== 'game' || !gameStarted || userDurationMinutes === 0) return;

    const timer = setInterval(() => {
      setRemainingTimeSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setViewState('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [viewState, gameStarted, userDurationMinutes]);

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = loginId.trim();
    const trimmedKey = loginKey.trim().toLowerCase();

    // Admin login check
    if (loginKey.trim() === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setUserId('ADMIN');
      setViewState('admin');
      showToast('👑 مرحباً أيها الأدمن (Admin Access Granted)');
      return;
    }

    // VIP Permanent code / Script Password (80E4D-8EA8F-7DF57-F891E or 2xee)
    if (loginKey.trim().toUpperCase() === PERMANENT_CODE.toUpperCase() || trimmedKey === '2xee') {
      setIsAdmin(false);
      setUserId(trimmedId || 'VIP-USER');
      setUserDurationMinutes(0); // 0 means permanent
      setGameStarted(false); // Do not start automatically
      setViewState('loading_overlay');

      setTimeout(() => {
        setViewState('game');
        showToast('✅ مرحباً بك في سكربت JOKER - اضغط بدء اللعبة للبدء');
      }, 3000);
      return;
    }

    // Standard user validation
    if (!trimmedId || !trimmedKey) {
      showToast('⚠️ يرجى إدخال ID وكود التفعيل');
      return;
    }

    if (trimmedId.length !== 10 || !/^\d{10}$/.test(trimmedId)) {
      showToast('⚠️ ID يجب أن يتكون من 10 أرقام');
      return;
    }

    // Check Firebase Users
    let foundUserData: any = null;
    let foundUserKey: string | null = null;

    Object.entries(firebaseUsers).forEach(([key, userVal]: [string, any]) => {
      if (userVal.code && userVal.code.toLowerCase() === trimmedKey) {
        foundUserData = userVal;
        foundUserKey = key;
      }
    });

    if (!foundUserData) {
      showToast('❌ كود التفعيل غير صحيح');
      return;
    }

    if (firebaseBanned[foundUserData.code]) {
      showToast('⛔ هذا الكود محظور');
      return;
    }

    // Expiry check
    if (!foundUserData.forever) {
      const createdAt = foundUserData.createdAt || Date.now();
      const expiry = createdAt + (foundUserData.minutes || 0) * 60 * 1000;
      if (Date.now() > expiry) {
        showToast('⏰ انتهت صلاحية هذا الكود');
        return;
      }
    }

    setIsAdmin(false);
    setUserId(trimmedId);
    setGameStarted(false); // Do not start game automatically
    
    // Duration setup
    if (foundUserData.forever) {
      setUserDurationMinutes(0);
    } else {
      const mins = foundUserData.minutes || 60;
      setUserDurationMinutes(mins);
      setRemainingTimeSeconds(mins * 60);
    }

    setViewState('loading_overlay');
    setTimeout(() => {
      setViewState('game');
      showToast('✅ تم تسجيل الدخول بنجاح! متصل بـ Wowbet - اضغط بدء اللعبة للبدء');
    }, 3000);
  };

  // Trigger m11 prediction generation
  const triggerPrediction = async () => {
    setIsPredicting(true);
    const newPredictions = generateM11Predictions();
    setPredictions(newPredictions);
    await saveM11PredictionsToFirebase(newPredictions);
    setIsPredicting(false);
  };

  // Start Game Button Handler
  const handleStartGame = async () => {
    await triggerPrediction();
    setGameStarted(true);
    showToast('🎮 بدأت اللعبة بنجاح! تم حفظ التوقعات في m11 بـ Firebase.');
  };

  // Generate new grid prediction
  const handleGuess = async () => {
    if (isPredicting) return;
    await triggerPrediction();
    showToast('✅ تم التخمين وتحديث التوقعات في m11 بـ Firebase!');
  };

  // Admin generate codes to Firebase
  const handleAdminGenerate = async () => {
    let mins = 0;
    let forever = false;
    if (genUnit === 'forever') {
      forever = true;
    } else if (genUnit === 'days') {
      mins = genValue * 24 * 60;
    } else if (genUnit === 'hours') {
      mins = genValue * 60;
    } else {
      mins = genValue;
    }

    const newGenerated: string[] = [];
    const updates: Record<string, any> = {};

    for (let i = 0; i < genCount; i++) {
      const code = generateStrongCode(16);
      newGenerated.push(code);
      const newId = `user_${Date.now()}_${i}`;
      updates[`${USERS_PATH}/${newId}`] = {
        code,
        minutes: mins,
        forever,
        createdAt: Date.now()
      };
    }

    try {
      await update(ref(db), updates);
      setGeneratedCodesOutput(newGenerated);
      showToast(`✅ تم توليد وحفظ ${genCount} كود بـ Firebase`);
    } catch (e) {
      showToast('❌ خطأ أثناء حفظ الأكواد في Firebase');
    }
  };

  // Admin Add Single Code to Firebase
  const handleAdminAddSingle = async () => {
    if (!newCodeInput.trim()) {
      showToast('⚠️ أدخل كود التفعيل أولاً');
      return;
    }
    let mins = 0;
    let forever = false;
    if (newCodeUnit === 'forever') {
      forever = true;
    } else if (newCodeUnit === 'days') {
      mins = newCodeValue * 24 * 60;
    } else if (newCodeUnit === 'hours') {
      mins = newCodeValue * 60;
    } else {
      mins = newCodeValue;
    }

    const newId = `user_${Date.now()}`;
    try {
      await set(ref(db, `${USERS_PATH}/${newId}`), {
        code: newCodeInput.trim(),
        minutes: mins,
        forever,
        createdAt: Date.now()
      });
      setNewCodeInput('');
      showToast('✅ تم إضافة الكود في Firebase بنجاح');
    } catch (e) {
      showToast('❌ خطأ في الإضافة');
    }
  };

  // Ban/Unban/Delete code in Firebase
  const toggleBanCode = async (code: string) => {
    const isBannedCurrently = !!firebaseBanned[code];
    try {
      if (isBannedCurrently) {
        await remove(ref(db, `${BANNED_PATH}/${code}`));
        showToast('✅ تم مسح حظر الكود');
      } else {
        await set(ref(db, `${BANNED_PATH}/${code}`), true);
        showToast('⛔ تم حظر الكود');
      }
    } catch (e) {
      showToast('❌ خطأ أثناء تغيير حالة الحظر');
    }
  };

  const deleteCode = async (userKey: string, code: string) => {
    try {
      await remove(ref(db, `${USERS_PATH}/${userKey}`));
      if (firebaseBanned[code]) {
        await remove(ref(db, `${BANNED_PATH}/${code}`));
      }
      showToast('🗑️ تم حذف الكود من Firebase');
    } catch (e) {
      showToast('❌ خطأ أثناء حذف الكود');
    }
  };

  // Format seconds to display time string
  const formatTime = (totalSecs: number) => {
    if (userDurationMinutes === 0) return '♾️ دائم';
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full min-h-screen min-h-[100dvh] bg-[#0b0e1a] font-['Almarai',sans-serif] text-white overflow-x-hidden selection:bg-red-600 selection:text-white">
      {/* Background Videos from HTML source */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className={`fixed inset-0 w-full h-full object-cover z-0 brightness-100 contrast-105 saturate-110 transition-opacity duration-1000 ${
          viewState === 'splash' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <source src="https://b.top4top.io/m_3856bwwmo0.mp4" type="video/mp4" />
      </video>
      <video
        autoPlay
        muted
        loop
        playsInline
        className={`fixed inset-0 w-full h-full object-cover z-0 brightness-100 contrast-105 saturate-110 transition-opacity duration-1000 ${
          viewState !== 'splash' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <source src="https://i.top4top.io/m_3856bsmsc0.mp4" type="video/mp4" />
      </video>

      {/* Background Subtle Overlay */}
      <div className="fixed inset-0 z-0 bg-black/10 pointer-events-none" />

      {/* Top Info Bar (Users & Version) */}
      <div className="fixed top-5 left-5 right-5 z-[100] flex justify-between items-center font-['Cinzel',monospace] gap-2 pointer-events-none dir-ltr">
        <div className="px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-red-500/20 text-white text-xs flex items-center gap-2 pointer-events-auto shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(255,0,0,0.8)]" />
          <span className="text-white/50 text-[10px] tracking-wider font-normal">Users</span>
          <span className="text-red-500 font-extrabold text-xs min-w-[30px] text-center">{onlineCount}</span>
        </div>
        <div className="px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-red-500/20 text-white text-xs flex items-center gap-1.5 pointer-events-auto shadow-lg">
          <Code className="w-3 h-3 text-red-500" />
          <span className="text-white/40 text-[9px] tracking-wider font-normal">Ver</span>
          <span className="text-red-500 font-extrabold text-xs">2.0.0</span>
        </div>
      </div>

      {/* ==================== 1. SPLASH SCREEN (CONNECTING LOADING & FRUIT) ==================== */}
      {viewState === 'splash' && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-5 bg-transparent">
          <div className="flex flex-col items-center justify-center z-10 animate-fade-in">
            <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-red-600/30 rounded-full blur-2xl animate-pulse" />
              <img
                src={JOKER_LOGO_IMG}
                alt="Joker Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_JOKER_LOGO_SVG;
                }}
                className="w-44 h-44 md:w-56 md:h-56 object-cover rounded-2xl border-2 border-red-500/40 drop-shadow-[0_0_35px_rgba(255,0,0,0.8)] animate-bounce"
              />
            </div>
            <h1 className="font-['Cinzel',serif] text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-purple-500 to-amber-500 tracking-widest mb-2">
              JOKER
            </h1>
            <p className="text-white/50 text-xs tracking-[6px] font-['Cinzel']">✦ SCRIPT JOKER ✦</p>
          </div>

          <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] flex flex-col items-center gap-3 z-10">
            {!loadingComplete ? (
              <div className="w-full flex flex-col items-center gap-2">
                <div className="w-full h-3.5 bg-red-950/40 rounded-full border border-red-500/30 overflow-hidden p-0.5 relative shadow-[0_0_15px_rgba(255,0,0,0.2)]">
                  <div
                    className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-600 rounded-full transition-all duration-150 ease-out shadow-[0_0_10px_rgba(255,0,0,0.8)]"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <span className="font-['Cinzel',monospace] text-sm text-red-500 font-bold tracking-widest">
                  {Math.floor(loadingProgress)}%
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center animate-fade-in-up">
                <CheckCircle className="w-10 h-10 text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] animate-pulse" />
                <h2 className="text-white text-base font-bold">تم التحميل</h2>
                <p className="text-white/40 text-xs tracking-wider mt-1">جاهز للانطلاق إلى سكربت JOKER</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. LOGIN PAGE ==================== */}
      {viewState === 'login' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[400px] bg-red-950/20 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-6 shadow-[0_0_50px_rgba(255,0,0,0.15)] flex flex-col items-center">
            {/* Header Brand */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <img
                src={JOKER_LOGO_IMG}
                alt="JOKER Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_JOKER_LOGO_SVG;
                }}
                className="w-28 h-28 object-cover rounded-2xl border border-red-500/40 drop-shadow-[0_0_20px_rgba(255,0,0,0.6)]"
              />
              <h2 className="font-['Cinzel',serif] font-black text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-amber-500">
                JOKER
              </h2>
              <span className="text-white/50 text-[10px] tracking-[6px] font-['Cinzel']">✦ VIP SCRIPT ✦</span>
            </div>

            {/* Promo Ticket */}
            <div className="w-full bg-black/40 border border-red-500/20 rounded-full px-4 py-2 flex items-center justify-between mb-4 dir-ltr">
              <div className="flex items-center gap-1.5 text-white/50 text-xs font-bold">
                <Ticket className="w-4 h-4 text-red-500" />
                <span>PROMO</span>
              </div>
              <span className="font-['Cinzel',monospace] font-bold text-red-500 text-sm tracking-wider px-3 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
                2xee
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText('2xee');
                  showToast('✅ تم نسخ الكود: 2xee');
                }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                نسخ
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-3.5 mb-4">
              <div className="flex items-center gap-2.5 bg-black/30 border border-white/10 rounded-full px-3 py-1.5 focus-within:border-red-500/50 transition-all">
                <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="ID (10 أرقام)"
                  maxLength={10}
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-sm w-full dir-ltr placeholder:text-white/30"
                />
              </div>

              <div className="flex items-center gap-2.5 bg-black/30 border border-white/10 rounded-full px-3 py-1.5 focus-within:border-red-500/50 transition-all">
                <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="كود التفعيل (Key)"
                  value={loginKey}
                  onChange={(e) => setLoginKey(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-sm w-full dir-ltr placeholder:text-white/30"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-extrabold text-base py-3 rounded-full shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <ArrowLeft className="w-5 h-5" />
                تسجيل الدخول
              </button>
            </form>

            {/* Telegram Links */}
            <div className="w-full flex flex-col gap-2">
              <a
                href="https://t.me/+zFBDKS7Btcg2ZjVk"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-black/20 border border-white/5 hover:border-red-500/30 rounded-full px-4 py-2 text-white/70 hover:text-white text-xs font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-red-500" />
                  <span>قناتنا التليجرام</span>
                </div>
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2.5 py-0.5 rounded-full">
                  OPEN
                </span>
              </a>
              <a
                href="https://t.me/Mr_Ah_med"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-black/20 border border-white/5 hover:border-red-500/30 rounded-full px-4 py-2 text-white/70 hover:text-white text-xs font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Headset className="w-4 h-4 text-red-500" />
                  <span>تواصل والدعم الفني</span>
                </div>
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2.5 py-0.5 rounded-full">
                  OPEN
                </span>
              </a>
            </div>

            <div className="mt-5 text-[10px] text-white/20 tracking-widest flex items-center gap-1">
              <Shield className="w-3 h-3 text-red-500/40" />
              <span>2026 JOKER SCRIPT</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. TRANSITION LOADING OVERLAY (CONNECTING TO WOWBET) ==================== */}
      {viewState === 'loading_overlay' && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="text-center max-w-sm w-full flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin mb-6" />
            <h2 className="font-['Cinzel',serif] text-red-500 text-2xl font-bold mb-3">⏳ جاري التحميل</h2>
            <div className="space-y-2 text-center dir-ltr">
              <div className="text-red-400 font-bold tracking-widest text-lg">Wowbet</div>
              <p className="text-white/50 text-xs">جاري ربط حسابك بمنصة والتجهيز للصفحة الرئيسية</p>
              <div className="text-red-500 font-extrabold text-base tracking-wide mt-2">
                انتظر يتم ربط حسابك ب منصه Wowbet...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. MAIN APPLE GAME PAGE ==================== */}
      {viewState === 'game' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 md:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-[550px] flex flex-col items-center gap-3">
            {/* User top status bar */}
            <div className="w-full px-4 py-2.5 bg-black/50 backdrop-blur-xl border border-red-500/20 rounded-2xl flex justify-between items-center text-xs text-white/40 dir-ltr shadow-lg">
              <div className="flex items-center gap-1.5 font-['Cinzel',monospace]">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span>ID:</span>
                <span className="text-red-500 font-extrabold text-sm">{userId}</span>
              </div>
              <div className="flex items-center gap-1.5 font-['Cinzel',monospace]">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Time:</span>
                <span className="text-red-500 font-extrabold text-sm dir-rtl">
                  {formatTime(remainingTimeSeconds)}
                </span>
              </div>
            </div>

            {/* Apple Game main card */}
            <div className="w-full bg-black/40 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-4 md:p-6 flex flex-col items-center shadow-[0_0_50px_rgba(255,0,0,0.15)]">
              <img
                src={JOKER_LOGO_IMG}
                alt="Joker Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_JOKER_LOGO_SVG;
                }}
                className="w-20 h-20 object-cover rounded-xl border border-red-500/40 mb-2 drop-shadow-[0_0_20px_rgba(255,0,0,0.6)]"
              />

              {/* Countdown Bar inside Game */}
              <div className="font-['Orbitron',monospace] text-sm md:text-base text-red-500 font-extrabold tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-red-500/30 w-full text-center mb-4 dir-ltr shadow-[0_0_20px_rgba(255,0,0,0.2)]">
                ⏱️ الوقت المتبقي: {formatTime(remainingTimeSeconds)}
              </div>

              {/* IF GAME NOT STARTED YET: Display "Start Game" overlay button */}
              {!gameStarted ? (
                <div className="w-full py-12 px-4 flex flex-col items-center justify-center border border-dashed border-red-500/30 rounded-2xl bg-black/30 my-2 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 animate-pulse">
                    <Play className="w-8 h-8 ml-1" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-white text-lg font-bold">لعبة تفاح JOKER جاهزة</h3>
                    <p className="text-white/50 text-xs">اضغط على زر "بدء اللعبة" لتفعيل توقع التوافق للعبة التفاح</p>
                  </div>
                  <button
                    onClick={handleStartGame}
                    disabled={isPredicting}
                    className="mt-2 bg-gradient-to-r from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-extrabold text-lg px-8 py-3.5 rounded-full shadow-[0_0_30px_rgba(255,0,0,0.5)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    بدء اللعبة
                  </button>
                </div>
              ) : (
                /* 10 Rows Apple Grid */
                <div className="w-full flex flex-col gap-2 py-1">
                  {ROW_CONFIG.map((row) => (
                    <div key={row.rowIndex} className="grid grid-cols-[44px_1fr] gap-2 items-center">
                      {/* Multiplier Badge */}
                      <div className="text-[11px] font-black text-center bg-red-950/40 border border-red-500/30 rounded-lg py-1 text-red-400 font-['Orbitron'] shadow-sm">
                        {row.multiplier}
                      </div>

                      {/* 5 Apple Cells for this row */}
                      <div className="grid grid-cols-5 gap-1.5 w-full">
                        {[0, 1, 2, 3, 4].map((colIndex) => {
                          const isSafe = isSafeApple(row.rowIndex, colIndex);

                          return (
                            <div
                              key={colIndex}
                              className={`aspect-square rounded-full border-2 flex items-center justify-center p-1 relative overflow-hidden transition-all duration-300 ${
                                isSafe
                                  ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-[1.04]'
                                  : 'border-red-600/40 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] scale-[1.02]'
                              }`}
                            >
                              <img
                                src={isSafe ? SAFE_APPLE_IMG : ROTTEN_APPLE_IMG}
                                alt="Apple"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = isSafe ? FALLBACK_SAFE_APPLE_SVG : FALLBACK_ROTTEN_APPLE_SVG;
                                }}
                                className={`w-full h-full object-contain rounded-full transition-all ${
                                  isSafe ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'opacity-60 saturate-50'
                                }`}
                              />
                              {/* Green Check mark overlay for safe apples */}
                              {isSafe && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-scale-up">
                                  <span className="text-emerald-400 font-black text-2xl md:text-3xl drop-shadow-[0_0_15px_rgba(16,185,129,1)]">
                                    ✔
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="mt-4 flex gap-3 w-full">
                {gameStarted && (
                  <button
                    onClick={handleGuess}
                    disabled={isPredicting}
                    className="flex-1 bg-gradient-to-r from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 disabled:opacity-50 text-white font-extrabold text-lg py-3 rounded-full shadow-[0_0_25px_rgba(255,0,0,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-5 h-5 ${isPredicting ? 'animate-spin' : ''}`} />
                    {isPredicting ? 'جاري التخمين...' : 'تخمين'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setGameStarted(false);
                    setViewState('login');
                  }}
                  className="bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white/70 hover:text-white px-6 py-3 rounded-full font-bold text-sm transition-all cursor-pointer flex-1"
                >
                  عودة
                </button>
              </div>
              <div className="text-white/30 text-xs mt-2 font-['Almarai']">🎯 اضغط تخمين للحصول على توقع التوافق الجديد</div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 5. ADMIN DASHBOARD PAGE ==================== */}
      {viewState === 'admin' && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-[650px] bg-red-950/20 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
              <h2 className="font-['Cinzel',serif] text-red-500 text-xl font-black flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                لوحة التحكم (Firebase Realtime)
              </h2>
            </div>

            {/* Stats Header */}
            <div className="grid grid-cols-3 gap-3 bg-black/40 p-3 rounded-2xl text-center border border-red-500/10 dir-rtl">
              <div>
                <div className="text-white/40 text-xs font-bold">👥 المستخدمين</div>
                <div className="text-red-500 font-extrabold text-lg font-['Orbitron'] mt-1">
                  {Object.keys(firebaseUsers).length}
                </div>
              </div>
              <div>
                <div className="text-white/40 text-xs font-bold">⏱️ المدة الافتراضية</div>
                <div className="text-red-500 font-extrabold text-lg font-['Orbitron'] mt-1">دائم</div>
              </div>
              <div>
                <div className="text-white/40 text-xs font-bold">🔑 المحظورين</div>
                <div className="text-red-500 font-extrabold text-lg font-['Orbitron'] mt-1">
                  {Object.keys(firebaseBanned).length}
                </div>
              </div>
            </div>

            {/* Code Generator Block */}
            <div className="bg-black/30 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                مولد الأكواد السريع في Firebase
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <select
                  value={genUnit}
                  onChange={(e) => setGenUnit(e.target.value)}
                  className="bg-black/50 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="minutes">دقائق</option>
                  <option value="hours">ساعات</option>
                  <option value="days">أيام</option>
                  <option value="forever">دائم (Forever)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={genValue}
                  onChange={(e) => setGenValue(Number(e.target.value))}
                  placeholder="المدة"
                  disabled={genUnit === 'forever'}
                  className="bg-black/50 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none dir-ltr disabled:opacity-40"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  placeholder="عدد الأكواد"
                  className="bg-black/50 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none dir-ltr"
                />
                <button
                  onClick={handleAdminGenerate}
                  className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-800 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  توليد الأكواد
                </button>
              </div>

              {generatedCodesOutput.length > 0 && (
                <div className="mt-2 bg-black/50 p-3 rounded-xl max-h-28 overflow-y-auto text-xs font-mono text-red-400 dir-ltr flex flex-col gap-1.5 border border-red-500/20">
                  {generatedCodesOutput.map((code, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span>{code}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(code);
                          showToast('✅ تم نسخ الكود');
                        }}
                        className="text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-0.5 rounded cursor-pointer"
                      >
                        نسخ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List of active codes in Firebase */}
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1 dir-ltr">
              {Object.entries(firebaseUsers).map(([userKey, userVal]: [string, any]) => {
                const code = userVal.code;
                const isBanned = !!firebaseBanned[code];

                return (
                  <div
                    key={userKey}
                    className="flex flex-wrap items-center justify-between bg-black/30 border border-white/5 p-3 rounded-xl text-xs gap-2"
                  >
                    <span className="font-mono text-red-400 font-bold">{code}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-black/40 px-2.5 py-1 rounded-full text-white/50 text-[11px]">
                        {userVal.forever ? 'دائم' : `${userVal.minutes} دقيقة`}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          isBanned ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {isBanned ? '🚫 محظور' : '🟢 نشط'}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => toggleBanCode(code)}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 cursor-pointer"
                        title={isBanned ? 'إلغاء الحظر' : 'حظر الكود'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCode(userKey, code)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                        title="حذف الكود"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Manual Single Code Add */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10 items-center dir-ltr">
              <input
                type="text"
                placeholder="كود التفعيل الجديد"
                value={newCodeInput}
                onChange={(e) => setNewCodeInput(e.target.value)}
                className="flex-1 bg-black/40 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <select
                value={newCodeUnit}
                onChange={(e) => setNewCodeUnit(e.target.value)}
                className="bg-black/40 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value="minutes">دقائق</option>
                <option value="hours">ساعات</option>
                <option value="days">أيام</option>
                <option value="forever">دائم</option>
              </select>
              <input
                type="number"
                value={newCodeValue}
                onChange={(e) => setNewCodeValue(Number(e.target.value))}
                disabled={newCodeUnit === 'forever'}
                className="w-16 bg-black/40 border border-red-500/20 rounded-xl px-2 py-2 text-xs text-white outline-none text-center disabled:opacity-40"
              />
              <button
                onClick={handleAdminAddSingle}
                className="bg-gradient-to-r from-red-700 to-red-600 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>

            <button
              onClick={() => setViewState('login')}
              className="mt-2 w-full py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              عودة لتسجيل الدخول
            </button>
          </div>
        </div>
      )}

      {/* ==================== 6. TIMEOUT OVERLAY PAGE ==================== */}
      {viewState === 'timeout' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-red-950/40 border-2 border-red-600/50 rounded-3xl p-8 text-center flex flex-col items-center gap-4 shadow-[0_0_80px_rgba(255,0,0,0.4)]">
            <AlertTriangle className="w-16 h-16 text-red-500 animate-bounce" />
            <h2 className="font-['Cinzel',serif] text-red-500 text-2xl font-black">⏰ وقت الجلسة انتهى</h2>
            <p className="text-white/60 text-xs leading-relaxed">
              انتهت مدة صلاحية كود التفعيل الخاص بك.<br />
              يرجى الحصول على كود جديد للوصول لصفحة التفاح مرة أخرى.
            </p>
            <button
              onClick={() => {
                setGameStarted(false);
                setViewState('login');
              }}
              className="w-full bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-extrabold text-sm py-3 rounded-full shadow-lg cursor-pointer mt-2"
            >
              إغلاق والعودة
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-red-500/30 text-red-400 px-6 py-2.5 rounded-full text-xs font-bold font-['Almarai'] shadow-[0_0_25px_rgba(255,0,0,0.3)] z-[99999] animate-fade-in-up">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
