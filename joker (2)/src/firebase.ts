import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, child } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCctr9RRD1HT-lSX7sA9rwmxclvXG4_pkk",
  authDomain: "ssss-7603b.firebaseapp.com",
  databaseURL: "https://ssss-7603b-default-rtdb.firebaseio.com",
  projectId: "ssss-7603b",
  storageBucket: "ssss-7603b.firebasestorage.app",
  messagingSenderId: "775617315923",
  appId: "1:775617315923:web:ec5d76be91ff9101f0f2a6",
  measurementId: "G-XR5MJC5K0P"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);

export const USERS_PATH = 'shadow_users';
export const GRID_PATH = 'shadow_grid';
export const BANNED_PATH = 'shadow_banned';
export const PREDICTIONS_PATH = 'm11';

export function generateM11Predictions() {
  const finalObject: Record<string, any> = {};

  for (let r = 0; r < 10; r++) {
    let safeCount = 4;
    if (r >= 4 && r < 7) safeCount = 3;      // Rows 4, 5, 6
    if (r >= 7 && r < 9) safeCount = 2;      // Rows 7, 8
    if (r >= 9) safeCount = 1;               // Row 9

    const safeCols: number[] = [];
    while (safeCols.length < safeCount) {
      const randomCol = Math.floor(Math.random() * 5);
      if (!safeCols.includes(randomCol)) {
        safeCols.push(randomCol);
      }
    }

    for (let c = 0; c < 5; c++) {
      const mIndex = r * 5 + c + 1;
      const value = safeCols.includes(c) ? "1" : "0";
      finalObject[`m${mIndex}`] = { [`m${mIndex}`]: value };
    }
  }

  return finalObject;
}

export async function saveM11PredictionsToFirebase(predictions: Record<string, any>) {
  try {
    const m11Ref = ref(db, PREDICTIONS_PATH);
    await set(m11Ref, predictions);
  } catch (e) {
    console.error('Error saving m11 predictions to Firebase:', e);
  }
}

export function listenToFirebaseM11Predictions(callback: (predictions: Record<string, any> | null) => void) {
  const m11Ref = ref(db, PREDICTIONS_PATH);
  return onValue(m11Ref, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

export function listenToFirebaseGrid(callback: (grid: Record<string, string> | null) => void) {
  const gridRef = ref(db, GRID_PATH);
  return onValue(gridRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
}

export async function saveGridToFirebase(gridData: Record<string, string>) {
  try {
    const gridRef = ref(db, GRID_PATH);
    await set(gridRef, gridData);
  } catch (e) {
    console.error('Error saving grid to Firebase:', e);
  }
}

export function listenToFirebaseUsers(callback: (users: Record<string, any> | null) => void) {
  const usersRef = ref(db, USERS_PATH);
  return onValue(usersRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

export function listenToFirebaseBanned(callback: (banned: Record<string, boolean> | null) => void) {
  const bannedRef = ref(db, BANNED_PATH);
  return onValue(bannedRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}
