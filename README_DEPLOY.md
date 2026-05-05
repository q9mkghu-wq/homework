# Firebase + GitHub + Vercel 배포 가이드

## 1) Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. `Build > Firestore Database`로 이동 후 데이터베이스 생성 (테스트 모드로 시작)
3. `Project settings > Your apps > Web app 추가`
4. 표시되는 SDK 설정값을 복사해서 `firebase-config.js`에 붙여넣기

예시:

```js
window.FIREBASE_CONFIG = {
  apiKey: "....",
  authDomain: "....firebaseapp.com",
  projectId: "....",
  storageBucket: "....appspot.com",
  messagingSenderId: "....",
  appId: "....",
};
window.FIREBASE_ROOM_KEY = "family-room-1";
```

Firestore Rules(최소 테스트용):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /homeworkRooms/{roomId}/days/{dayId} {
      allow read, write: if true;
    }
  }
}
```

## 2) GitHub 업로드

터미널에서 프로젝트 폴더로 이동 후 실행:

```bash
git init
git add .
git commit -m "Initial homework app with Firebase sync"
git branch -M main
git remote add origin https://github.com/<YOUR_ID>/<YOUR_REPO>.git
git push -u origin main
```

## 3) Vercel 배포

1. [Vercel](https://vercel.com/) 로그인 (GitHub 연동)
2. `New Project` > 방금 만든 GitHub 저장소 선택
3. Framework preset은 `Other` 그대로
4. Deploy 클릭

배포 완료 후 URL 접속:
- 부모 폰, 아이 폰에서 같은 URL 열기
- `firebase-config.js`의 `FIREBASE_ROOM_KEY`가 같으면 같은 데이터 공유

## 4) 확인 포인트

- 상단에 `동기화: Firebase 연결됨` 표시되면 정상
- 한 기기에서 문제 추가 후 다른 기기 새로고침 없이 반영되면 성공
