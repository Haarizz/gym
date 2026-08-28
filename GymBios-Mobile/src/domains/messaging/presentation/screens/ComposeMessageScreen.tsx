import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { MessagingFlowHeader } from '../components/MessagingFlowHeader';
import { MessageTypeSelector } from '../components/MessageTypeSelector';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { useSendMessage, useMessagingTemplates } from '../../hooks/useMessagingHooks';
import { MessagingColors } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

const VAR_GROUPS = [
  { g: 'Member', vars: ['FirstName', 'LastName', 'FullName', 'Email', 'Phone'] },
  { g: 'Membership', vars: ['MembershipPlan', 'MembershipStatus', 'ExpiryDate', 'JoinDate'] },
  { g: 'Gym', vars: ['GymName', 'Location'] },
];

const SAMPLE = {
  FirstName: 'Jordan', LastName: 'Blake', FullName: 'Jordan Blake', Email: 'jordan@example.com', 
  Phone: '(415) 555-0132', MembershipPlan: 'Premium', MembershipStatus: 'Active', 
  GymName: 'Iron Peak Fitness', Location: 'Downtown', ExpiryDate: 'Sep 14, 2026', JoinDate: 'Jan 3, 2024'
};

export function ComposeMessageScreen() {
  const router = useRouter();
  const segments = useSegments();
  const roleGroup = segments[0] || '(admin)';
  
  const params = useLocalSearchParams<{
    templateSubject?: string;
    templateContent?: string;
    templateType?: string;
    // Real app might pass recipient count or ids here
  }>();
  const { mutate: sendMessage, isPending } = useSendMessage();
  const { data: templates = [] } = useMessagingTemplates();

  const [messageType, setMessageType] = useState('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  
  const [selectedTemplate, setSelectedTemplate] = useState<{t: string; snip: string} | null>(null);
  const [templateSheetVisible, setTemplateSheetVisible] = useState(false);
  const [varSheetVisible, setVarSheetVisible] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (params.templateSubject) {
      setSubject(params.templateSubject);
      setSelectedTemplate({ t: params.templateSubject, snip: params.templateContent || '' });
    }
    if (params.templateContent) setContent(params.templateContent);
    if (params.templateType) setMessageType(params.templateType);
  }, [params.templateSubject, params.templateContent, params.templateType]);

  const insertVar = (name: string) => {
    setContent((prev) => `${prev}{${name}}`);
    setVarSheetVisible(false);
  };

  const handleSend = () => {
    setSent(true);
    sendMessage(
      {
        type: messageType,
        subject,
        content,
        recipients: [], 
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            router.replace(`/${roleGroup}/messaging/history` as any);
          }, 1500);
        },
      }
    );
  };

  const renderPreviewText = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (match, key) => (SAMPLE as any)[key] ? (SAMPLE as any)[key] : match);
  };

  const renderPreview = () => {
    const body = renderPreviewText(content || 'Your message will appear here...');
    if (messageType === 'email') {
      return (
        <View style={styles.previewBox}>
          <Text style={styles.pvSubj}>{renderPreviewText(subject || '(No subject)')}</Text>
          <Text style={styles.pvBody}>{body}</Text>
        </View>
      );
    }
    if (messageType === 'sms') {
      return (
        <View style={[styles.previewBox, { backgroundColor: 'transparent', borderWidth: 0 }]}>
          <View style={styles.pvSmsContainer}>
            <View style={styles.pvSmsBubble}>
              <Text style={styles.pvSmsText}>{body}</Text>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.previewBox}>
        <View style={styles.pvPushCard}>
          <View style={styles.pvPushIcon}>
            <Feather name="bell" size={16} color={MessagingColors.push} />
          </View>
          <View style={styles.pvPushTexts}>
            <Text style={styles.pvPushT1}>{SAMPLE.GymName}</Text>
            <Text style={styles.pvPushT2}>{body}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <MessagingFlowHeader 
        title="Compose Message"
        subtitle="Send new messages & campaigns"
        step={2}
        onBack={() => router.back()}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} automaticallyAdjustKeyboardInsets>
        <Pressable style={styles.recipChip} onPress={() => router.back()}>
          <View style={styles.avatarStack}>
            {/* Mock avatars since we don't have recipient data passed in this limited scope */}
            <View style={[styles.avatarMicro, { backgroundColor: '#2F8A73' }]}><Text style={styles.avatarMicroTxt}>JB</Text></View>
            <View style={[styles.avatarMicro, { backgroundColor: '#4FA3D1', marginLeft: -8 }]}><Text style={styles.avatarMicroTxt}>LC</Text></View>
            <View style={[styles.avatarMicro, { backgroundColor: '#8E7CC3', marginLeft: -8 }]}><Text style={styles.avatarMicroTxt}>DP</Text></View>
          </View>
          <View style={styles.recipTextWrap}>
            <Text style={styles.recipTextCount}>3 recipients selected</Text>
            <Text style={styles.recipTextSub}>Tap to edit list</Text>
          </View>
          <Feather name="chevron-right" size={18} color={MessagingColors.muted} />
        </Pressable>

        {sent && (
          <View style={styles.sentBanner}>
            <Text style={styles.sentBannerText}>✅  Message queued for 3 recipients</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Message type</Text>
          <MessageTypeSelector selectedType={messageType} onSelectType={setMessageType} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Template</Text>
          <Pressable style={styles.tplField} onPress={() => setTemplateSheetVisible(true)}>
            <View style={styles.tplIc}>
              <Feather name="layout" size={16} color={MessagingColors.dark} />
            </View>
            <View style={styles.tplTextWrap}>
              <Text style={styles.tplT1}>{selectedTemplate ? selectedTemplate.t : 'Choose a template'}</Text>
              <Text style={styles.tplT2}>{selectedTemplate ? 'Tap to switch template' : 'Optional — start from a saved message'}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={MessagingColors.faint} />
          </Pressable>
        </View>

        {messageType === 'email' && (
          <View style={styles.section}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.field}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter message subject"
              placeholderTextColor={MessagingColors.faint}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.contentToolbar}>
            <View style={styles.tabRow}>
              <Pressable style={[styles.tabBtn, tab === 'edit' && styles.tabBtnActive]} onPress={() => setTab('edit')}>
                <Text style={[styles.tabBtnText, tab === 'edit' && styles.tabBtnTextActive]}>Edit</Text>
              </Pressable>
              <Pressable style={[styles.tabBtn, tab === 'preview' && styles.tabBtnActive]} onPress={() => setTab('preview')}>
                <Text style={[styles.tabBtnText, tab === 'preview' && styles.tabBtnTextActive]}>Preview</Text>
              </Pressable>
            </View>
            <Pressable style={styles.varBtn} onPress={() => setVarSheetVisible(true)}>
              <Feather name="code" size={13} color={MessagingColors.dark} />
              <Text style={styles.varBtnText}>Insert variable</Text>
            </Pressable>
          </View>

          {tab === 'preview' ? (
            renderPreview()
          ) : (
            <>
              <TextInput
                style={[styles.field, styles.textArea]}
                value={content}
                onChangeText={setContent}
                placeholder="Type your message here..."
                placeholderTextColor={MessagingColors.faint}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.counter}>
                {messageType === 'sms' 
                  ? `${content.length} chars · ${Math.max(1, Math.ceil(content.length / 160))} SMS segment${Math.ceil(content.length / 160) > 1 ? 's' : ''}`
                  : `${content.length} / 1000`}
              </Text>
            </>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ghostBtn} onPress={() => setTab(tab === 'edit' ? 'preview' : 'edit')}>
          <Text style={styles.ghostBtnText}>{tab === 'edit' ? 'Preview' : 'Edit'}</Text>
        </Pressable>
        <Pressable onPress={handleSend} disabled={isPending || sent}>
          {({ pressed }) => (
            <LinearGradient
              colors={isPending || sent ? ['#D6D5DE', '#D6D5DE'] : [MessagingColors.accent, MessagingColors.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryBtn, !(isPending || sent) && styles.primaryBtnShadow, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.primaryBtnText}>{isPending ? 'Sending...' : 'Send to 3'}</Text>
            </LinearGradient>
          )}
        </Pressable>
      </View>

      <AppBottomSheet
        visible={templateSheetVisible}
        title="Choose a template"
        onClose={() => setTemplateSheetVisible(false)}
      >
        <View style={styles.sheetSearch}>
          <Feather name="search" size={15} color={MessagingColors.faint} />
          <Text style={{ color: MessagingColors.faint, marginLeft: 9, fontSize: 13.5 }}>Search templates...</Text>
        </View>
        <View style={styles.sheetList}>
          {templates.map((t) => (
            <Pressable 
              key={t.id} 
              style={styles.stpl}
              onPress={() => {
                setSelectedTemplate({ t: t.subject, snip: t.content });
                setSubject(t.subject);
                setContent(t.content);
                setMessageType(t.type || 'email');
                setTemplateSheetVisible(false);
              }}
            >
              <View style={styles.stplIc}>
                <Feather name={t.type === 'sms' ? 'message-circle' : t.type === 'push' ? 'bell' : 'mail'} size={16} color={MessagingColors.muted} />
              </View>
              <View style={styles.stplMeta}>
                <Text style={styles.stplT1}>{t.name}</Text>
                <Text style={styles.stplT2}>{t.category} · used recently</Text>
              </View>
              <Feather name="chevron-right" size={18} color={MessagingColors.faint} />
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.sheetBrowse} onPress={() => {
          setTemplateSheetVisible(false);
          router.push(`/${roleGroup}/messaging/templates` as any);
        }}>
          <Text style={styles.sheetBrowseText}>Browse full template library →</Text>
        </Pressable>
      </AppBottomSheet>

      <AppBottomSheet
        visible={varSheetVisible}
        title="Insert Variable"
        onClose={() => setVarSheetVisible(false)}
      >
        <View style={styles.varMenuContainer}>
          {VAR_GROUPS.map(g => (
            <View key={g.g} style={styles.varGroupBlock}>
              <Text style={styles.varGrpTitle}>{g.g}</Text>
              <View style={styles.varChipRow}>
                {g.vars.map(v => (
                  <Pressable key={v} style={styles.varChipBtn} onPress={() => insertVar(v)}>
                    <Text style={styles.varChipBtnTxt}>{`{${v}}`}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MessagingColors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  recipChip: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: MessagingColors.tint,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarMicro: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: MessagingColors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMicroTxt: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  recipTextWrap: {
    flex: 1,
  },
  recipTextCount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: MessagingColors.inkA,
  },
  recipTextSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#5C8E80',
    marginTop: 1,
  },
  sentBanner: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: MessagingColors.tint,
    borderWidth: 1.5,
    borderColor: MessagingColors.accent,
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentBannerText: {
    color: MessagingColors.inkA,
    fontSize: 12.5,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: MessagingColors.faint,
    marginBottom: 9,
  },
  tplField: {
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
    backgroundColor: MessagingColors.card,
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tplIc: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: MessagingColors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tplTextWrap: {
    flex: 1,
  },
  tplT1: {
    fontSize: 13,
    fontWeight: '700',
    color: MessagingColors.ink,
  },
  tplT2: {
    fontSize: 11.5,
    color: MessagingColors.faint,
    fontWeight: '500',
  },
  field: {
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
    backgroundColor: MessagingColors.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    fontSize: 13.5,
    color: MessagingColors.ink,
  },
  textArea: {
    height: 120,
  },
  contentToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EEEDF4',
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: MessagingColors.muted,
  },
  tabBtnTextActive: {
    color: MessagingColors.ink,
  },
  varBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: MessagingColors.tint,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  varBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: MessagingColors.dark,
  },
  counter: {
    textAlign: 'right',
    fontSize: 11,
    color: MessagingColors.faint,
    fontWeight: '600',
    marginTop: 6,
  },
  previewBox: {
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FBFBFD',
    minHeight: 100,
  },
  pvSubj: {
    fontSize: 12.5,
    fontWeight: '700',
    color: MessagingColors.ink,
    borderBottomWidth: 1,
    borderBottomColor: MessagingColors.line,
    paddingBottom: 9,
    marginBottom: 9,
  },
  pvBody: {
    fontSize: 12.5,
    lineHeight: 20,
    color: MessagingColors.muted,
  },
  pvSmsContainer: {
    alignItems: 'flex-end',
  },
  pvSmsBubble: {
    backgroundColor: MessagingColors.sms,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 13,
    maxWidth: '78%',
  },
  pvSmsText: {
    color: '#ffffff',
    fontSize: 12.5,
    lineHeight: 19,
  },
  pvPushCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  pvPushIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: MessagingColors.pushTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pvPushTexts: {
    flex: 1,
  },
  pvPushT1: {
    fontSize: 12,
    fontWeight: '700',
  },
  pvPushT2: {
    fontSize: 11.5,
    color: MessagingColors.muted,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: MessagingColors.card,
    borderTopWidth: 1,
    borderTopColor: MessagingColors.line,
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingBottom: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ghostBtn: {
    borderWidth: 1.6,
    borderColor: MessagingColors.line,
    backgroundColor: '#ffffff',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  ghostBtnText: {
    fontWeight: '700',
    fontSize: 13.5,
    color: MessagingColors.muted,
  },
  primaryBtn: {
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
    minWidth: 130,
    alignItems: 'center',
  },
  primaryBtnShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  sheetSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MessagingColors.card,
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 18,
    marginBottom: 10,
  },
  sheetList: {
    paddingHorizontal: 18,
    maxHeight: 250,
  },
  stpl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: MessagingColors.line,
  },
  stplIc: {
    backgroundColor: '#F1F0F6',
    width: 30, height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stplMeta: {
    flex: 1,
  },
  stplT1: {
    fontSize: 13,
    fontWeight: '700',
    color: MessagingColors.ink,
  },
  stplT2: {
    fontSize: 11.5,
    color: MessagingColors.faint,
    marginTop: 2,
  },
  sheetBrowse: {
    padding: 18,
    alignItems: 'center',
  },
  sheetBrowseText: {
    color: MessagingColors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  varMenuContainer: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  varGroupBlock: {
    marginBottom: 12,
  },
  varGrpTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: MessagingColors.faint,
    marginBottom: 8,
  },
  varChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  varChipBtn: {
    backgroundColor: '#F4F3F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  varChipBtnTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: MessagingColors.ink,
  }
});
