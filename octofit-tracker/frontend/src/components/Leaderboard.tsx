import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { rank: number; teamName: string; totalPoints: number };

const loadLeaderboard = async () => (await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')).leaderboard;

export default function Leaderboard() {
  return <CapabilityCard
    title="Leaderboard"
    description="Compare team point totals."
    emptyMessage="No leaderboard rankings yet."
    load={loadLeaderboard}
    renderItem={(entry) => `${entry.rank}. ${entry.teamName} — ${entry.totalPoints} points`}
  />;
}
