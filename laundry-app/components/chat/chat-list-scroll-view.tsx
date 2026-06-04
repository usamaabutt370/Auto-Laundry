import { forwardRef } from "react";
import type { ScrollViewProps } from "react-native";
import {
  KeyboardChatScrollView,
  type KeyboardChatScrollViewProps,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Approximate composer row height (input + send), excluding safe-area padding. */
const COMPOSER_ROW_HEIGHT = 62;

type Ref = React.ElementRef<typeof KeyboardChatScrollView>;

/**
 * FlatList scroll component that lifts messages when the keyboard opens.
 * `offset` = space reserved for the sticky composer below the list.
 */
export const ChatListScrollView = forwardRef<
  Ref,
  ScrollViewProps & KeyboardChatScrollViewProps
>((props, ref) => {
  const { bottom } = useSafeAreaInsets();
  const offset = COMPOSER_ROW_HEIGHT + Math.max(bottom, 10);

  return (
    <KeyboardChatScrollView
      ref={ref}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      keyboardDismissMode="interactive"
      keyboardLiftBehavior="whenAtEnd"
      offset={offset}
      {...props}
    />
  );
});

ChatListScrollView.displayName = "ChatListScrollView";
