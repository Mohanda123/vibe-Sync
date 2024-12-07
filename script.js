// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwM-VALID-API-KEY",
  authDomain: "vibesync-13a71.firebaseapp.com",
  databaseURL: "https://vibesync-13a71-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "vibesync-13a71",
  storageBucket: "vibesync-13a71.appspot.com",
  messagingSenderId: "706014160580",
  appId: "1:706014160580:web:e671a32710e1e3af644b91",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Spotify API Configuration
const clientId = "f590d37c449c461da3a5f7adc1f9a2a3";
const clientSecret = "0fe79166119e40a6a645bcec3a7c3434";

// Global Variables
let userName = "Anonymous";
let roomId = null;
let audio = null;
let accessToken = "";

// Attach functions to the window for HTML access
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.searchAndPlay = searchAndPlay;
window.playpauseTrack = playpauseTrack;
window.sendMessage = sendMessage;
window.setUserName = setUserName;

// Get Spotify API Access Token
async function getAccessToken() {
  if (accessToken) return accessToken;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  accessToken = data.access_token;
  return accessToken;
}

// Set User Name
function setUserName() {
  const input = document.getElementById("userNameInput").value;
  if (input.trim()) {
    userName = input;
    alert(`Welcome, ${userName}!`);
  } else {
    alert("Please enter a valid name.");
  }
}

// Create Room
function createRoom() {
  roomId = prompt("Enter a unique room name:");
  if (!roomId) return;

  set(ref(db, `rooms/${roomId}`), {
    currentSong: null,
    timestamp: 0,
    isPlaying: false,
    messages: [],
  });

  alert(`Room "${roomId}" created! Share this name with your friends.`);
  listenForRoomUpdates();
}

// Join Room
function joinRoom() {
  roomId = prompt("Enter the room name to join:");
  if (!roomId) return;

  listenForRoomUpdates();
}

// Listen for Room Updates
function listenForRoomUpdates() {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();

    if (data.currentSong) {
      document.querySelector(".track-art").style.backgroundImage = `url(${data.currentSong.artwork})`;
      document.querySelector(".track-name").textContent = data.currentSong.name;
      document.querySelector(".track-artist").textContent = data.currentSong.artist;

      if (data.isPlaying && data.currentSong.url) {
        if (!audio || audio.src !== data.currentSong.url) {
          audio = new Audio(data.currentSong.url);
        }
        audio.currentTime = data.timestamp;
        audio.play();
      } else if (audio) {
        audio.pause();
      }
    }

    displayMessages(data.messages || []);
  });
}

// Search and Play Tracks
async function searchAndPlay() {
  const query = document.getElementById("spotifySearch").value;
  if (!query) {
    alert("Please enter a song name.");
    return;
  }

  const results = await searchSong(query);

  const resultsContainer = document.getElementById("searchResults");
  resultsContainer.innerHTML = "";

  results.forEach((track) => {
    const trackDiv = document.createElement("div");
    trackDiv.textContent = `${track.name} by ${track.artists.map((artist) => artist.name).join(", ")}`;
    trackDiv.classList.add("track");
    trackDiv.onclick = () => selectTrack(track);
    resultsContainer.appendChild(trackDiv);
  });
}

async function searchSong(query) {
  const token = await getAccessToken();
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  return data.tracks.items;
}

function selectTrack(track) {
  if (!track.preview_url) {
    alert("This track does not have a preview available. Please select another track.");
    return;
  }

  const roomRef = ref(db, `rooms/${roomId}`);
  update(roomRef, {
    currentSong: {
      url: track.preview_url,
      name: track.name,
      artist: track.artists.map((artist) => artist.name).join(", "),
      artwork: track.album.images[0].url,
    },
    timestamp: 0,
    isPlaying: true,
  });

  // Set the audio source
  audio = new Audio(track.preview_url);
}

// Play/Pause Track
function playpauseTrack() {
  if (!audio || !audio.src) {
    alert("No track loaded to play. Please select a track from the search results.");
    return;
  }

  const roomRef = ref(db, `rooms/${roomId}`);
  if (audio.paused) {
    audio.play();
    update(roomRef, { isPlaying: true, timestamp: audio.currentTime });
  } else {
    audio.pause();
    update(roomRef, { isPlaying: false, timestamp: audio.currentTime });
  }
}

// Send Chat Message
function sendMessage() {
  const message = document.getElementById("chatInput").value;
  if (!message) return;

  const messagesRef = ref(db, `rooms/${roomId}/messages`);
  push(messagesRef, { user: userName, message });
  document.getElementById("chatInput").value = "";
}

// Display Chat Messages
function displayMessages(messages) {
  const chatBox = document.getElementById("chatMessages");
  chatBox.innerHTML = "";
  for (let key in messages) {
    const msg = messages[key];
    const messageDiv = document.createElement("div");
    messageDiv.textContent = `${msg.user}: ${msg.message}`;
    chatBox.appendChild(messageDiv);
  }
}
