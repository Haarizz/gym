import { useCallback, useState } from 'react';

export type CropRatio = '1:1' | '4:5' | '9:16';

export interface ComposerImage {
  /** data: URI produced by expo-image-picker with base64:true */
  dataUrl: string;
  uri: string;
}

export interface ComposerState {
  topic: string;
  type: string;
  content: string;
  image: ComposerImage | null;
  cropRatio: CropRatio;
  cropPosition: number;
  cropZoom: number;
}

const INITIAL_STATE: ComposerState = {
  topic: '',
  type: 'achievement',
  content: '',
  image: null,
  cropRatio: '4:5',
  cropPosition: 50,
  cropZoom: 100,
};

/**
 * Local presentation state for the Create Community Post composer.
 * No server state is stored here — only the form fields needed to build
 * a CreateCommunityPostRequest before calling useCreateCommunityPost().
 */
export function useCommunityPostComposer() {
  const [topic, setTopic] = useState(INITIAL_STATE.topic);
  const [type, setType] = useState(INITIAL_STATE.type);
  const [content, setContent] = useState(INITIAL_STATE.content);
  const [image, setImage] = useState<ComposerImage | null>(INITIAL_STATE.image);
  const [cropRatio, setCropRatio] = useState<CropRatio>(INITIAL_STATE.cropRatio);
  const [cropPosition, setCropPosition] = useState(INITIAL_STATE.cropPosition);
  const [cropZoom, setCropZoom] = useState(INITIAL_STATE.cropZoom);

  const reset = useCallback(() => {
    setTopic(INITIAL_STATE.topic);
    setType(INITIAL_STATE.type);
    setContent(INITIAL_STATE.content);
    setImage(null);
    setCropRatio(INITIAL_STATE.cropRatio);
    setCropPosition(INITIAL_STATE.cropPosition);
    setCropZoom(INITIAL_STATE.cropZoom);
  }, []);

  return {
    topic,
    setTopic,
    type,
    setType,
    content,
    setContent,
    image,
    setImage,
    cropRatio,
    setCropRatio,
    cropPosition,
    setCropPosition,
    cropZoom,
    setCropZoom,
    reset,
  };
}
