import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {chatApi, ChatRequest, ChatResponse} from '../../services/api/chatApi';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadInitialMessage();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialMessage = async () => {
    try {
      const response = await chatApi.getInitialMessage();
      setMessages([
        {
          id: 'initial',
          text: response.mesaj,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setError('Nu s-a putut incarca mesajul initial');
      setShowError(true);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      const request: ChatRequest = {
        message: userMessage.text,
        conversation_id: 'default',
      };

      const response: ChatResponse = await chatApi.sendMessage(request);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.raspuns,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error === 'prea_multe_cereri'
          ? 'Ai depasit limita de mesaje. Te rugam sa astepti.'
          : err.response?.data?.error === 'buget_depasit'
          ? 'Bugetul lunar a fost depasit. Te rugam sa incerci mai tarziu.'
          : 'Eroare la trimiterea mesajului. Te rugam sa incerci din nou.';

      setError(errorMessage);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="robot" size={20} color={colors.brand.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Asistent Virtual</Text>
          <Text style={styles.headerSubtitle}>MoneyShop AI</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}>
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.messageWrapper,
              msg.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
            ]}>
            {!msg.isUser && (
              <View style={styles.botAvatar}>
                <Icon name="robot" size={14} color={colors.brand.primary} />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.isUser ? styles.userBubble : styles.botBubble,
              ]}>
              <Text
                style={[
                  styles.messageText,
                  msg.isUser ? styles.userMessageText : styles.botMessageText,
                ]}>
                {msg.text}
              </Text>
              {!msg.isUser && msg.id === 'initial' && (
                <View style={styles.disclaimerContainer}>
                  <Icon name="information-outline" size={12} color={colors.warning[400]} />
                  <Text style={styles.disclaimerText}>
                    Disclaimer: Asistentul virtual ofera informatii generale si
                    explicatii educationale. Nu reprezinta consultanta financiara
                    personalizata.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.botMessageWrapper}>
            <View style={styles.botAvatar}>
              <Icon name="robot" size={14} color={colors.brand.primary} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={colors.brand.primary} />
              <Text style={styles.typingText}>Se proceseaza...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Scrie mesajul tau..."
            placeholderTextColor={colors.light[50]}
            multiline
            maxLength={2000}
            editable={!loading}
          />
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.8}
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}>
          <Icon name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={4000}
        style={styles.snackbar}>
        {error || 'Eroare'}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.xxl + spacing.lg : spacing.lg,
    backgroundColor: colors.dark[700],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[400],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.info[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.light[60],
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success[500],
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageWrapper: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  userBubble: {
    backgroundColor: colors.brand.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: colors.dark[600],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.bodyMedium,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: colors.light[90],
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.sm,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.light[60],
    flex: 1,
    lineHeight: 16,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  typingText: {
    ...typography.bodySmall,
    color: colors.light[60],
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    backgroundColor: colors.dark[700],
    borderTopWidth: 1,
    borderTopColor: colors.dark[400],
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.dark[400],
    paddingHorizontal: spacing.md,
  },
  input: {
    ...typography.bodyMedium,
    color: colors.light[100],
    maxHeight: 100,
    paddingVertical: spacing.sm + 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  snackbar: {
    backgroundColor: colors.error[500],
  },
});

export default ChatScreen;
