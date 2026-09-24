import TopNav from "../components/ui/navbar";
import ProfileSidebarCard from "../components/home/ProfileSidebarCard";
import SkillsCard from "../components/home/SkillsCard";
import StoryRow from "../components/home/StoryRow";
import PostComposer from "../components/home/PostComposer";
import PostCard from "../components/home/PostCard";
import ActivityCard from "../components/home/ActivityCard";
import { usePosts } from "../hooks/usePosts";
import { useEffect, useState } from "react";
import { api, fetchFriends } from "../lib/api";

const skills = ["UX Designer", "Front end and Back End developer", "JS coder", "UX Designer", "UX Designer"];

export default function HomePage() {
  const { posts, loading, error, addPost } = usePosts();
  const [activity, setActivity] = useState([]);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    Promise.all([api("/friends/requests/received"), fetchFriends()])
      .then(([requests, friends]) => {
        setActivity(requests.map((request) => ({
        id: request.id,
        name: request.user.name,
        action: "sent you a friend request",
        })));
        setStories(friends.map((friend) => ({
          id: friend.id,
          name: friend.name || friend.username,
          avatar: `https://i.pravatar.cc/100?u=${friend.id}`,
        })));
      })
      .catch(() => setActivity([]));
  }, []);

  const removeActivity = (requestId) => {
    setActivity((current) => current.filter((item) => item.id !== requestId));
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <TopNav />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 px-6 pb-10">
        <aside className="space-y-6">
          <ProfileSidebarCard />
          <SkillsCard skills={skills} />
        </aside>

        <main className="space-y-6">
          <StoryRow stories={stories} />
          <PostComposer onPostCreated={addPost} />
          <div className="space-y-6">
            {loading && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-850 p-6 text-sm text-neutral-400 animate-pulse">
                Loading your feed...
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-6">
                <p className="text-sm font-semibold text-red-200">We could not load your feed.</p>
                <p className="mt-1 text-sm text-red-300/70">Check that you are signed in and the API is running.</p>
              </div>
            )}
            {!loading && !error && posts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-800/50 p-8 text-center">
                <p className="text-white font-semibold">Your feed is quiet</p>
                <p className="mt-1 text-sm text-neutral-400">Share something or follow people to get the conversation started.</p>
              </div>
            )}
            {!loading && !error && posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </main>

        <aside>
          <ActivityCard activity={activity} onRequestHandled={removeActivity} />
        </aside>
      </div>
    </div>
  );
}