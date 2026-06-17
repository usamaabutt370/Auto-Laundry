import { forwardRef, useCallback, type RefCallback } from "react";
import type { ScrollViewProps } from "react-native";
import {
  KeyboardChatScrollView,
  type KeyboardChatScrollViewProps,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Approximate composer row height (input + send), excluding safe-area padding. */
export const COMPOSER_ROW_HEIGHT = 62;

type Ref = React.ElementRef<typeof KeyboardChatScrollView>;

type ChatListScrollViewProps = ScrollViewProps &
  KeyboardChatScrollViewProps & {
    /** Use for `scrollToEnd` while the keyboard is open (FlatList ref is not enough). */
    chatScrollViewRef?: React.MutableRefObject<Ref | null>;
  };

/**
 * FlatList scroll component that lifts messages when the keyboard opens.
 * `offset` = space reserved for the sticky composer below the list.
 */
export const ChatListScrollView = forwardRef<Ref, ChatListScrollViewProps>(
  ({ chatScrollViewRef, ...props }, ref) => {
    const { bottom } = useSafeAreaInsets();
    const offset = Math.max(bottom - 8, 0);

    const combinedRef: RefCallback<Ref> = useCallback(
      (instance) => {
        if (typeof ref === "function") {
          ref(instance);
        } else if (ref) {
          ref.current = instance;
        }
        if (chatScrollViewRef) {
          chatScrollViewRef.current = instance;
        }
      },
      [chatScrollViewRef, ref],
    );

    return (
      <KeyboardChatScrollView
        ref={combinedRef}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardLiftBehavior="always"
        offset={offset}
        {...props}
      />
    );
  },
);

ChatListScrollView.displayName = "ChatListScrollView";
