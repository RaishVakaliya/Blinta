import Story from "./Story";
import StoryViewer from "./StoryViewer";
import { styles } from "@/styles/feed.styles";
import { ScrollView } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export type StoryData = {
  _id: string;
  userId: string;
  imageUrl: string;
  createdAt: number;
  username: string;
  avatar: string;
  hasStory: boolean;
  isCurrentUser: boolean;
};

const StoriesSection = () => {
  const stories = useQuery(api.stories.getStories) as StoryData[] | undefined;
  const [selectedStory, setSelectedStory] = useState<StoryData | null>(null);
  const [seenStoryIds, setSeenStoryIds] = useState<string[]>([]);

  if (stories === undefined || stories.length === 0) {
    return null;
  }

  const handleOpenStory = (story: StoryData) => {
    setSelectedStory(story);
    setSeenStoryIds((prev) =>
      prev.includes(story._id) ? prev : [...prev, story._id],
    );
  };

  const handleCloseStory = () => {
    setSelectedStory(null);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storiesContainer}
      >
        {stories.map((story) => (
          <Story
            key={story._id}
            story={{
              id: story._id,
              username: story.username,
              avatar: story.avatar,
              hasStory: story.hasStory,
            }}
            seen={seenStoryIds.includes(story._id)}
            onPress={() => handleOpenStory(story)}
          />
        ))}
      </ScrollView>

      <StoryViewer
        visible={!!selectedStory}
        story={selectedStory}
        onClose={handleCloseStory}
      />
    </>
  );
};

export default StoriesSection;
