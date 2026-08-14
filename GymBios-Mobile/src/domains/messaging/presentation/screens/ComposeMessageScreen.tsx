import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/shared/components/AppHeader';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { BrandColors, Spacing, TypographyScale, Radius } from '@/core/theme';
import { MessageTypeSelector } from '../components/MessageTypeSelector';
import { useSendMessage } from '../../hooks/useMessagingHooks';

export function ComposeMessageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    templateSubject?: string;
    templateContent?: string;
    templateType?: string;
  }>();
  const { mutate: sendMessage, isPending } = useSendMessage();

  const [messageType, setMessageType] = useState('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (params.templateSubject) setSubject(params.templateSubject);
    if (params.templateContent) setContent(params.templateContent);
    if (params.templateType) setMessageType(params.templateType);
  }, [params.templateSubject, params.templateContent, params.templateType]);

  const availableVariables = [
    '{FirstName}', '{LastName}', '{FullName}', '{Email}', '{Phone}', 
    '{MembershipPlan}', '{MembershipStatus}', '{GymName}', '{Location}', 
    '{ExpiryDate}', '{JoinDate}'
  ];

  const handleVariablePress = (variable: string) => {
    setContent((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${variable}`);
  };

  const handleSend = () => {
    sendMessage(
      {
        type: messageType,
        subject,
        content,
        recipients: [], // In a real app, this would be populated from the previous screen's context or state manager
      },
      {
        onSuccess: () => {
          router.replace('/(admin)/messaging/history');
        },
      }
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="Compose Message"
        subtitle="Send new messages & campaigns"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => router.back()}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.recipientsSummary}>
          <Text style={styles.summaryText}>Sending to selected recipients</Text>
        </View>

        <MessageTypeSelector selectedType={messageType} onSelectType={setMessageType} />

        <View style={styles.formGroup}>
          <Text style={styles.label}>Template</Text>
          <Button
            title="Choose Template"
            variant="outline"
            onPress={() => router.push('/(admin)/messaging/templates')}
            style={styles.templateButton}
          />
        </View>

        {messageType === 'email' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
            <Input
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter message subject"
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Message Content</Text>
          <Input
            value={content}
            onChangeText={setContent}
            placeholder="Type your message here..."
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.personalizationContainer}>
           <Text style={styles.label}>Available Variables</Text>
           <View style={styles.variablesWrapper}>
             {availableVariables.map((variable) => (
               <Pressable 
                 key={variable} 
                 style={styles.variableChip}
                 onPress={() => handleVariablePress(variable)}
               >
                 <Text style={styles.variableChipText}>{variable}</Text>
               </Pressable>
             ))}
           </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Preview"
          variant="outline"
          onPress={() => {}}
          style={styles.actionButton}
        />
        <Button
          title="Send"
          onPress={handleSend}
          loading={isPending}
          disabled={!content || (messageType === 'email' && !subject)}
          style={styles.actionButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  recipientsSummary: {
    backgroundColor: 'rgba(50, 127, 116, 0.1)',
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.four,
  },
  summaryText: {
    color: BrandColors.teal,
    fontWeight: '500',
    fontSize: TypographyScale.body,
  },
  formGroup: {
    marginBottom: Spacing.four,
  },
  label: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  templateButton: {
    justifyContent: 'flex-start',
  },
  personalizationContainer: {
    marginTop: Spacing.two,
    marginBottom: Spacing.six,
  },
  variablesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  variableChip: {
    backgroundColor: 'rgba(50, 127, 116, 0.1)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(50, 127, 116, 0.2)',
  },
  variableChipText: {
    color: BrandColors.tealDark,
    fontSize: TypographyScale.small,
    fontFamily: 'monospace',
  },
  footer: {
    padding: Spacing.four,
    backgroundColor: BrandColors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionButton: {
    flex: 1,
  },
});
