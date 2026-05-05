// Firebase Console > Project settings > Your apps > SDK setup and configuration
// 아래 값을 본인 프로젝트 값으로 바꿔주세요.
// 설정 전에는 자동으로 로컬 모드로 동작합니다.
window.FIREBASE_CONFIG = {
apiKey: "AIzaSyCz7Lk2gWeRvEDbAPNz2KDhAkXC0EwpVmE",
  authDomain: "homework-5dff5.firebaseapp.com",
  projectId: "homework-5dff5",
  storageBucket: "homework-5dff5.firebasestorage.app",
  messagingSenderId: "135317383773",
  appId: "1:135317383773:web:15780a338a6f0421a63bb4"
};

// 가족별로 공유 방을 나누고 싶다면 값을 바꾸세요.
window.FIREBASE_ROOM_KEY = "family-room-1";

// 부모 전용 모드(?mode=parent)에서 사용할 비밀번호
window.PARENT_PIN = "1234";
