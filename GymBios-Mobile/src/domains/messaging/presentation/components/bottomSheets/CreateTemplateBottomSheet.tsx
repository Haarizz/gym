import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Spacing } from '@/core/theme';
import { useTranslation } from 'react-i18next';
import { useCreateMessageTemplate } from '../../../hooks/useMessagingHooks';

interface CreateTemplateBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateTemplateBottomSheet({ visible, onClose }: CreateTemplateBottomSheetProps) {
  const { t } = useTranslation();
  const { mutateAsync: createTemplate } = useCreateMessageTemplate();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await createTemplate({
        name,
        subject,
        content,
        category: 'general',
        type: 'email',
        variables: ['FirstName', 'LastName'],
        active: true,
      });
      setName('');
      setSubject('');
      setContent('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={t('messaging.templates.modalTitle')}
      subtitle={t('messaging.templates.modalSubtitle')}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input
          label={t('messaging.templates.templateName')}
          value={name}
          onChangeText={setName}
          placeholder={t('messaging.templates.templateNamePlaceholder')}
        />
        <Input
          label={t('messaging.compose.subject')}
          value={subject}
          onChangeText={setSubject}
          placeholder={t('messaging.compose.subjectPlaceholder')}
        />
        <Input
          label={t('messaging.templates.content')}
          value={content}
          onChangeText={setContent}
          placeholder={t('messaging.templates.contentPlaceholder')}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        
        {/* We use standard Button instead of label/loading size based on previous usage */}
        <Button
          title={t('messaging.templates.createBtn')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!name || !content}
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
});
