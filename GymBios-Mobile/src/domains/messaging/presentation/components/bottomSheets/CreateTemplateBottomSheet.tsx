import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Spacing } from '@/core/theme';
import { useCreateMessageTemplate } from '../../../hooks/useMessagingHooks';

interface CreateTemplateBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateTemplateBottomSheet({ visible, onClose }: CreateTemplateBottomSheetProps) {
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
      title="Create New Template"
      subtitle="Add a new message template"
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input
          label="Template Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Welcome Email"
        />
        <Input
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder="Enter message subject"
        />
        <Input
          label="Message Content"
          value={content}
          onChangeText={setContent}
          placeholder="Type your template content here..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        
        {/* We use standard Button instead of label/loading size based on previous usage */}
        <Button
          title="Create Template"
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
