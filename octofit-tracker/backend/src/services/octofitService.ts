import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const isObjectId = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value) && mongoose.isValidObjectId(value);

  if (!isObjectId(userId) || !isObjectId(teamId) || typeof type !== 'string' || !type.trim() ||
      typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Activity requires valid userId, teamId, type, and positive minutes'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user and team must exist'), { status: 400 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim() ||
      !Array.isArray(members) || members.some((member) => typeof member !== 'string' ||
        !/^[0-9a-f]{24}$/i.test(member) || !mongoose.isValidObjectId(member))) {
    throw Object.assign(new Error('Team requires a name, mascot, and valid member IDs'), { status: 400 });
  }

  const uniqueMembers = [...new Set(members)];
  const foundMembers = await User.countDocuments({ _id: { $in: uniqueMembers } });
  if (foundMembers !== uniqueMembers.length) {
    throw Object.assign(new Error('All team members must exist'), { status: 400 });
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: uniqueMembers });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map(({ _id }) => _id) } }).select('name').lean();
  const teamNames = new Map(teams.map(({ _id, name }) => [_id.toString(), name]));

  return totals
    .filter(({ _id }) => teamNames.has(_id.toString()))
    .map(({ _id, totalPoints }, index) => ({
      teamName: teamNames.get(_id.toString()),
      totalPoints,
      rank: index + 1,
    }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const activities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const focusByActivity: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'endurance',
    strength: 'strength',
  };
  const activityFocus = activities.map(({ type }) => focusByActivity[type.toLowerCase()] ?? type.toLowerCase());
  const preferredFocus = typeof user.fitnessGoal === 'string' && user.fitnessGoal.trim()
    ? user.fitnessGoal.toLowerCase()
    : activityFocus[0];
  const preferredActivity = activities.find(({ type }) =>
    (focusByActivity[type.toLowerCase()] ?? type.toLowerCase()) === preferredFocus,
  );
  const workouts = await Workout.find().lean();

  return workouts
    .map((workout) => {
      const focus = workout.focus.toLowerCase();
      const matchesActivity = activityFocus.includes(focus);
      const matchesGoal = focus === preferredFocus;
      const reason = matchesGoal && preferredActivity
        ? `Matches your ${preferredFocus} goal and ${preferredActivity.type} activity pattern.`
        : matchesGoal
          ? `Matches your ${preferredFocus} fitness goal.`
          : matchesActivity
            ? `Matches your ${focus} activity pattern.`
            : `Suggested to help explore ${focus}.`;
      return { ...workout, reason, relevance: Number(matchesGoal) + Number(matchesActivity) };
    })
    .sort((left, right) => right.relevance - left.relevance || left.title.localeCompare(right.title))
    .map(({ relevance: _relevance, ...suggestion }) => suggestion);
}

export { User };
