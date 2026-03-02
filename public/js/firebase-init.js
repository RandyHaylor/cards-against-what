import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// ──────────────────────────────────────────────
// Paste your Firebase config here.
// Firebase Console → Project Settings → Your apps → Config
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBBqeRGVH08LhGl6NnTvX-J0Qr6iCnOOig",
  authDomain:        "cardsagainstwhat.firebaseapp.com",
  databaseURL:       "https://cardsagainstwhat-default-rtdb.firebaseio.com",
  projectId:         "cardsagainstwhat",
  storageBucket:     "cardsagainstwhat.firebasestorage.app",
  messagingSenderId: "808328792842",
  appId:             "1:808328792842:web:59b83499d1323cf1ff88f3",
  measurementId:     "G-MHD3N279Q9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
