import React, { useState, useEffect, useRef } from 'react';
import { Send, Volume2, Settings, Users, Bot, MessageCircle, ArrowLeft, Copy, Check, Clipboard, AlertCircle } from 'lucide-react';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBALl9vW4r1QGhEV6Qwv1W4ri_XQpFH_MI",
  authDomain: "rittin.firebaseapp.com",
  databaseURL: "https://rittin-default-rtdb.firebaseio.com",
  projectId: "rittin",
  storageBucket: "rittin.firebasestorage.app",
  messagingSenderId: "216245713754",
  appId: "1:216245713754:web:2b78de0ecdc77b01ebd163",
  measurementId: "G-6FZSL63571"
};

// Initialize Firebase (using CDN approach to avoid build complexity)
let firebase = null;
let database = null;

const initializeFirebase = () => {
  if (typeof window !== 'undefined' && window.firebase && !firebase) {
    firebase = window.firebase;
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();
  }
};

const MessageSkeleton = () => (
  <div className="flex flex-col gap-2 animate-pulse">
    <div className="h-10 bg-gray-200 rounded-lg w-3/4"></div>
    <div className="h-6 bg-gray-200 rounded-lg w-1/2"></div>
    <div className="h-4 bg-gray-200 rounded-lg w-1/4"></div>
  </div>
);

const RittinChat = () => {
  // State variables
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPhonetics, setShowPhonetics] = useState(true);
  const [userLanguage, setUserLanguage] = useState('🇺🇸 English (American)');
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [chatMode, setChatMode] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userDialect, setUserDialect] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerLanguage, setPartnerLanguage] = useState('');
  const [showRoomSetup, setShowRoomSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [punctuationStyle, setPunctuationStyle] = useState('casual');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [lastMessageTime, setLastMessageTime] = useState(null);
  const [roomData, setRoomData] = useState({});
  const [roomMessages, setRoomMessages] = useState({});
  const [tipRegeneratedMessages, setTipRegeneratedMessages] = useState(new Set());
  const [tipLoadingMessages, setTipLoadingMessages] = useState(new Set());
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmissions, setFeedbackSubmissions] = useState([]);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const messagesEndRef = useRef(null);
  const firebaseListenerRef = useRef(null);

  // Constants
  const languages = [
    '🇺🇸 English (American)',
    '🇲🇽 Spanish (Latin America)',
    '🇪🇸 Spanish (Spain)',
    '🇧🇷 Portuguese (Brazil)',
    '🇵🇹 Portuguese (Portugal)',
    '🇫🇷 French',
    '🇩🇪 German',
    '🇮🇹 Italian',
    '🇯🇵 Japanese',
    '🇰🇷 Korean',
    '🇨🇳 Mandarin Chinese'
  ];

  const dialectExamples = {
    '🇺🇸 English (American)': 'e.g., New York, Southern, Texas, California',
    '🇲🇽 Spanish (Latin America)': 'e.g., Mexican, Paisa, Cuban, Argentinian',
    '🇪🇸 Spanish (Spain)': 'e.g., Andalusian, Madrid, Catalan, Basque',
    '🇧🇷 Portuguese (Brazil)': 'e.g., Paulista, Carioca, Nordestino, Gaúcho',
    '🇵🇹 Portuguese (Portugal)': 'e.g., Lisbon, Porto, Minho, Alentejo',
    '🇫🇷 French': 'e.g., Parisian, Quebec, Marseille, Belgian',
    '🇩🇪 German': 'e.g., Bavarian, Berlin, Austrian, Swiss',
    '🇮🇹 Italian': 'e.g., Roman, Neapolitan, Milanese, Sicilian',
    '🇯🇵 Japanese': 'e.g., Tokyo, Kansai, Kyushu, Tohoku',
    '🇰🇷 Korean': 'e.g., Seoul, Busan, Jeolla, Gyeongsang',
    '🇨🇳 Mandarin Chinese': 'e.g., Beijing, Shanghai, Taiwanese, Sichuan'
  };

  const feedbackCategories = [
    { value: 'translation_error', label: 'Translation is incorrect' },
    { value: 'cultural_tip_wrong', label: 'Cultural tip is wrong' },
    { value: 'bot_repetitive', label: 'Bot is being repetitive' },
    { value: 'grammar_phonetics', label: 'Grammar/phonetics error' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'technical_issue', label: 'Technical issue' },
    { value: 'other', label: 'Other' }
  ];

  // Utility functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isNewConversation = () => {
    if (!lastMessageTime) return true;
    const now = new Date();
    const timeDifference = now - lastMessageTime;
    const sixtyMinutesInMs = 60 * 60 * 1000;
    return timeDifference > sixtyMinutesInMs;
  };

  const updateLastMessageTime = () => {
    const now = new Date();
    setLastMessageTime(now);
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Enhanced message animation styles
  const messageAnimationClass = "animate-message-appear transition-all duration-300 ease-out";
  const tipAnimationClass = "animate-tip-appear transition-all duration-500 ease-out";

  // Message handling functions with loading state
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const newMessage = {
      id: `${Date.now()}_${userName}`,
      sender: userName,
      senderLanguage: userLanguage,
      original: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInputText('');
    setIsLoading(true);
    setMessages(prev => [...prev, newMessage, { id: 'loading', type: 'loading' }]);

    try {
      if (chatMode === 'maria') {
        console.log('Starting María bot response flow');

        try {
          const userTranslation = await generateTranslationAndTip(
            newMessage.original,
            userLanguage,
            '🇲🇽 Spanish (Latin America)',
            messages.slice(-5),
            true
          );

          setMessages(prev => prev.filter(msg => msg.id !== 'loading').map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, ...userTranslation }
              : msg
          ));

          const mariaResponse = await generateMariaResponse(
            newMessage.original,
            messages.slice(-5)
          );

          // Update last message time after successful message exchange
          updateLastMessageTime();

          const mariaMessage = {
            id: Date.now() + 1,
            sender: 'maria',
            senderLanguage: 'Spanish (Latin America)',
            original: mariaResponse.response,
            translation: mariaResponse.translation,
            phonetic: mariaResponse.phonetic,
            tip: mariaResponse.tip,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => [...prev.filter(msg => msg.id !== 'loading'), mariaMessage]);

        } catch (error) {
          console.error('Error in María bot flow:', error);
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'maria',
            senderLanguage: 'Spanish (Latin America)',
            original: "Ay perdón, tuve un problema técnico!",
            translation: "Oh sorry, I had a technical problem!",
            phonetic: "ah-ee per-DOHN, TOO-veh oon pro-BLEH-mah TEHK-nee-ko",
            tip: "Sometimes technology fails us - that's when we practice patience!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev.filter(msg => msg.id !== 'loading'), errorMessage]);
        }

      } else if (chatMode === 'maya') {
        // Similar flow for Maya bot
        console.log('Starting Maya bot response flow');
        setMessages(prev => [...prev, newMessage]);

        try {
          const userTranslation = await generateTranslationAndTip(
            newMessage.original,
            userLanguage,
            '🇲🇽 Spanish (Latin America)',
            messages.slice(-5),
            true
          );

          setMessages(prev => prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, ...userTranslation }
              : msg
          ));

          const mayaResponse = await generateMayaResponse(
            newMessage.original,
            messages.slice(-5)
          );

          updateLastMessageTime();

          const mayaMessage = {
            id: Date.now() + 1,
            sender: 'maya',
            senderLanguage: 'Spanish (Mexico)',
            original: mayaResponse.response,
            translation: mayaResponse.translation,
            phonetic: mayaResponse.phonetic,
            tip: mayaResponse.tip,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => [...prev, mayaMessage]);

        } catch (error) {
          console.error('Error in Maya bot flow:', error);
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'maya',
            senderLanguage: 'Spanish (Mexico)',
            original: "Ay, perdón! Tuve un problema técnico.",
            translation: "Oh, sorry! I had a technical problem.",
            phonetic: "ah-ee per-DOHN! TOO-veh oon pro-BLEH-mah TEHK-nee-ko",
            tip: "Sometimes technology fails us - that's when we practice patience!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, errorMessage]);
        }

      } else if (chatMode === 'sari') {
        // Similar flow for Sari bot
        console.log('Starting Sari bot response flow');
        setMessages(prev => [...prev, newMessage]);

        try {
          const userTranslation = await generateTranslationAndTip(
            newMessage.original,
            userLanguage,
            '🇮🇩 Indonesian',
            messages.slice(-5),
            true
          );

          setMessages(prev => prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, ...userTranslation }
              : msg
          ));

          const sariResponse = await generateSariResponse(
            newMessage.original,
            messages.slice(-5)
          );

          updateLastMessageTime();

          const sariMessage = {
            id: Date.now() + 1,
            sender: 'sari',
            senderLanguage: 'Indonesian (Bali)',
            original: sariResponse.response,
            translation: sariResponse.translation,
            phonetic: sariResponse.phonetic,
            tip: sariResponse.tip,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => [...prev, sariMessage]);

        } catch (error) {
          console.error('Error in Sari bot flow:', error);
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'sari',
            senderLanguage: 'Indonesian (Bali)',
            original: "Maaf, ada masalah teknis.",
            translation: "Sorry, there was a technical problem.",
            phonetic: "mah-AHF, AH-dah mah-SAH-lah TEHK-nees",
            tip: "Sometimes technology needs patience - like waiting for the perfect sunrise over Mount Batur!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, errorMessage]);
        }

      } else {
        // Human-to-human mode
        const translation = await generateTranslationAndTip(
          newMessage.original,
          userLanguage,
          '🇲🇽 Spanish (Latin America)',
          messages.slice(-5),
          true
        );

        const completeMessage = { 
          ...newMessage, 
          ...translation
        };
        
        setMessages(prev => [...prev, completeMessage]);
        sendMessageToRoom(completeMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        ...newMessage,
        translation: newMessage.original,
        phonetic: newMessage.original,
        tip: "Error processing message. Please try again."
      };
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? errorMessage : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateTranslationAndTip = async (text, fromLang, toLang, context, includePhonetics = true) => {
    // Simulated translation and tip generation
    // In a real implementation, this would call a translation API and AI service
    const translations = {
      '🇺🇸 English (American)': {
        '🇲🇽 Spanish (Latin America)': {
          translation: 'Hola, ¿cómo estás?',
          phonetic: 'OH-lah, koh-moh ehs-TAHS',
          tip: 'In Latin American Spanish, "¿cómo estás?" is a casual greeting used among friends.'
        }
      }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      translation: translations[fromLang]?.[toLang]?.translation || text,
      phonetic: includePhonetics ? (translations[fromLang]?.[toLang]?.phonetic || '') : '',
      tip: translations[fromLang]?.[toLang]?.tip || 'Cultural tip will be added soon!'
    };
  };

  const generateMariaResponse = async (text, context) => {
    // Simulated bot response generation
    // In a real implementation, this would call an AI service
    const responses = {
      default: {
        response: '¡Qué interesante! Cuéntame más sobre eso.',
        translation: 'How interesting! Tell me more about that.',
        phonetic: 'keh een-teh-reh-SAHN-teh! KWEHN-tah-meh MAHS soh-breh EH-soh',
        tip: 'In Colombian Spanish, we often use "¡Qué interesante!" to show genuine interest in what someone is saying.'
      }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return responses.default;
  };

  const generateMayaResponse = async (text, context) => {
    // Similar to María's response generator but with Mexican Spanish characteristics
    const responses = {
      default: {
        response: '¡Órale! Eso está padre. Dime más.',
        translation: 'Cool! That\'s awesome. Tell me more.',
        phonetic: 'OH-rah-leh! EH-soh ehs-TAH PAH-dreh. DEE-meh MAHS',
        tip: 'In Mexican Spanish, "padre" is a common slang term meaning "cool" or "awesome".'
      }
    };

    await new Promise(resolve => setTimeout(resolve, 1500));

    return responses.default;
  };

  const generateSariResponse = async (text, context) => {
    // Response generator for Sari with Indonesian characteristics
    const responses = {
      default: {
        response: 'Wah, menarik sekali! Cerita lebih banyak dong.',
        translation: 'Wow, that\'s very interesting! Please tell me more.',
        phonetic: 'wah, meh-NAH-reek seh-KAH-lee! cheh-REE-tah LEH-bee BAH-nyak dong',
        tip: 'In Indonesian, "dong" is a particle that makes requests sound friendlier and more casual.'
      }
    };

    await new Promise(resolve => setTimeout(resolve, 1500));

    return responses.default;
  };

  // Room and Firebase functions
  const sendMessageToFirebase = async (message) => {
    if (!database || !roomCode) return;

    try {
      const messageRef = database.ref(`rooms/${roomCode}/messages`).push();
      await messageRef.set({
        ...message,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
    } catch (error) {
      console.error('Error sending message to Firebase:', error);
    }
  };

  const setupFirebaseListener = () => {
    if (!database || !roomCode) return;

    const roomRef = database.ref(`rooms/${roomCode}`);
    
    // Remove previous listener if exists
    if (firebaseListenerRef.current) {
      firebaseListenerRef.current();
    }

    // Listen for new messages
    firebaseListenerRef.current = roomRef.child('messages').on('child_added', (snapshot) => {
      const message = snapshot.val();
      if (!roomMessages[message.id]) {
        setRoomMessages(prev => ({
          ...prev,
          [message.id]: message
        }));
      }
    });

    // Listen for room data changes
    roomRef.child('data').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoomData(data);
      }
    });

    return () => {
      if (firebaseListenerRef.current) {
        firebaseListenerRef.current();
      }
    };
  };

  const setupRoomParticipants = async () => {
    if (!database || !roomCode) return;

    const roomRef = database.ref(`rooms/${roomCode}/data`);
    const roomSnapshot = await roomRef.get();
    const roomData = roomSnapshot.val();

    if (!roomData) {
      // First participant (host)
      await roomRef.set({
        host: {
          name: userName,
          language: userLanguage,
          dialect: userDialect,
          email: userEmail
        }
      });
      setIsHost(true);
    } else if (!roomData.guest) {
      // Second participant (guest)
      await roomRef.update({
        guest: {
          name: userName,
          language: userLanguage,
          dialect: userDialect,
          email: userEmail
        }
      });
      setPartnerName(roomData.host.name);
      setPartnerLanguage(roomData.host.language);
    } else {
      throw new Error('Room is full');
    }
  };

  const sendMessageToRoom = (message) => {
    if (chatMode === 'human' && isConnected) {
      sendMessageToFirebase(message);
    }
    setMessages(prev => [...prev, message]);
  };

  const checkForNewMessages = () => {
    const sortedMessages = Object.values(roomMessages).sort((a, b) => a.timestamp - b.timestamp);
    setMessages(sortedMessages);
  };

  const createRoom = () => {
    const newRoomCode = generateRoomCode();
    setRoomCode(newRoomCode);
    setIsHost(true);
    setupRoomParticipants();
    setupFirebaseListener();
    setShowRoomSetup(false);
    setIsConnected(true);
  };

  const joinRoom = () => {
    if (!roomCode) return;

    setupRoomParticipants()
      .then(() => {
        setupFirebaseListener();
        setShowRoomSetup(false);
        setIsConnected(true);
      })
      .catch((error) => {
        console.error('Error joining room:', error);
        alert(error.message);
      });
  };

  // Utility functions for UI interactions
  const copyMessageToClipboard = async (message) => {
    const textToCopy = `${message.original}\n${message.translation || ''}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const openFeedbackModal = (message) => {
    setFeedbackMessage(message);
    setShowFeedbackModal(true);
  };

  const submitFeedback = () => {
    if (!feedbackCategory || !feedbackText) return;

    const feedback = {
      id: Date.now(),
      messageId: feedbackMessage.id,
      category: feedbackCategory,
      description: feedbackText,
      email: feedbackEmail,
      timestamp: new Date().toISOString()
    };

    setFeedbackSubmissions(prev => [...prev, feedback]);
    setShowFeedbackModal(false);
    setFeedbackCategory('');
    setFeedbackText('');
    setFeedbackMessage(null);
    
    // Show feedback toast
    setShowFeedbackToast(true);
    setTimeout(() => setShowFeedbackToast(false), 3000);
  };

  const regenerateTip = async (message) => {
    if (tipLoadingMessages.has(message.id)) return;

    setTipLoadingMessages(prev => new Set([...prev, message.id]));

    try {
      // Simulated tip regeneration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newTip = 'Here\'s a new cultural tip! (This is a placeholder - in a real implementation, this would be generated by an AI service)';
      
      setMessages(prev => prev.map(msg =>
        msg.id === message.id
          ? { ...msg, tip: newTip }
          : msg
      ));

      setTipRegeneratedMessages(prev => new Set([...prev, message.id]));
    } catch (error) {
      console.error('Error regenerating tip:', error);
    } finally {
      setTipLoadingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(message.id);
        return newSet;
      });
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(error => console.error('Failed to copy room code:', error));
  };

  // Effect hooks
  useEffect(() => {
    initializeFirebase();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatMode === 'human' && isConnected) {
      checkForNewMessages();
    }
  }, [chatMode, isConnected, roomMessages]);

  // JSX Structure
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Initial Setup Modal */}
      {!isSetupComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Welcome to Rittin!</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Email (optional)</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Language</label>
                <select
                  value={userLanguage}
                  onChange={(e) => setUserLanguage(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Dialect (optional)</label>
                <input
                  type="text"
                  value={userDialect}
                  onChange={(e) => setUserDialect(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder={dialectExamples[userLanguage]}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Choose Your Chat Mode</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      setChatMode('maria');
                      setIsSetupComplete(true);
                    }}
                    className="flex items-center justify-center p-4 border-2 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    <Bot className="w-6 h-6 mr-2" />
                    <div>
                      <p className="font-medium">María from Medellín</p>
                      <p className="text-sm text-gray-500">Spanish Practice</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setChatMode('maya');
                      setIsSetupComplete(true);
                    }}
                    className="flex items-center justify-center p-4 border-2 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    <Bot className="w-6 h-6 mr-2" />
                    <div>
                      <p className="font-medium">Maya from CDMX</p>
                      <p className="text-sm text-gray-500">Mexican Spanish</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setChatMode('sari');
                      setIsSetupComplete(true);
                    }}
                    className="flex items-center justify-center p-4 border-2 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    <Bot className="w-6 h-6 mr-2" />
                    <div>
                      <p className="font-medium">Sari from Ubud</p>
                      <p className="text-sm text-gray-500">Indonesian Practice</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setChatMode('human');
                      setShowRoomSetup(true);
                      setIsSetupComplete(true);
                    }}
                    className="flex items-center justify-center p-4 border-2 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    <Users className="w-6 h-6 mr-2" />
                    <div>
                      <p className="font-medium">Chat with Humans</p>
                      <p className="text-sm text-gray-500">Language Exchange</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Setup Modal */}
      {showRoomSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Language Exchange Room</h2>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <button
                  onClick={createRoom}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Room
                </button>
                <button
                  onClick={() => setShowRoomSetup(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Join Room
                </button>
              </div>
              {roomCode && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Share this code with your language partner:</p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-gray-100 p-2 rounded">{roomCode}</code>
                    <button
                      onClick={copyRoomCode}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Copy room code"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
              {!isHost && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Code</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter room code"
                    />
                    <button
                      onClick={joinRoom}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Join
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        {/* Chat Header */}
        <div className="bg-white shadow rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {chatMode === 'human' ? (
              <>
                <Users className="w-6 h-6" />
                <span>{partnerName ? `Chat with ${partnerName}` : 'Language Exchange'}</span>
              </>
            ) : (
              <>
                <Bot className="w-6 h-6" />
                <span>
                  {chatMode === 'maria' && 'Chat with María from Medellín'}
                  {chatMode === 'maya' && 'Chat with Maya from CDMX'}
                  {chatMode === 'sari' && 'Chat with Sari from Ubud'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPhonetics(!showPhonetics)}
              className={`p-2 rounded-full ${showPhonetics ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Toggle phonetics"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 bg-white shadow rounded-lg p-4 mb-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              message.type === 'loading' ? (
                <div key="loading" className="flex justify-start">
                  <div className="max-w-[80%]">
                    <MessageSkeleton />
                  </div>
                </div>
              ) : (
                <div
                  key={message.id}
                  className={`flex ${message.sender === userName ? 'justify-end' : 'justify-start'} ${messageAnimationClass}`}
                >
                  <div className={`max-w-[70%] ${message.sender === userName ? 'bg-blue-500 text-white' : 'bg-gray-100'} rounded-lg p-3`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{message.sender}</span>
                      <span className="text-xs opacity-75">{message.timestamp}</span>
                    </div>
                    <p className="mb-1">{message.original}</p>
                    {message.translation && (
                      <p className="text-sm opacity-75">{message.translation}</p>
                    )}
                    {showPhonetics && message.phonetic && (
                      <p className="text-xs italic mt-1 opacity-75">{message.phonetic}</p>
                    )}
                    {message.tip && (
                      <div className={`mt-2 text-sm bg-yellow-100 bg-opacity-20 p-2 rounded ${tipAnimationClass}`}>
                        <div className="flex items-start justify-between">
                          <p className="flex-1">{message.tip}</p>
                          <button
                            onClick={() => regenerateTip(message)}
                            className="ml-2 text-xs opacity-75 hover:opacity-100"
                            disabled={tipLoadingMessages.has(message.id)}
                          >
                            {tipLoadingMessages.has(message.id) ? '...' : '↻'}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-2 space-x-2">
                      <button
                        onClick={() => copyMessageToClipboard(message)}
                        className="text-xs opacity-75 hover:opacity-100"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Clipboard className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openFeedbackModal(message)}
                        className="text-xs opacity-75 hover:opacity-100"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading || !inputText.trim() ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Report an Issue</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {feedbackCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Please describe the issue..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Email (optional)</label>
                <input
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your email for follow-up"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitFeedback}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Punctuation Style</label>
                <select
                  value={punctuationStyle}
                  onChange={(e) => setPunctuationStyle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Show Phonetics</label>
                <button
                  onClick={() => setShowPhonetics(!showPhonetics)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 ${
                    showPhonetics ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
                      showPhonetics ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {showFeedbackToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Thank you for your feedback!
        </div>
      )}
    </div>
  );
};

export default RittinChat; 