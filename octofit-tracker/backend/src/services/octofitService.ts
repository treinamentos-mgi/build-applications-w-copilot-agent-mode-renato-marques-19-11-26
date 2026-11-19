import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Dados da atividade inválidos'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as {
    userId?: unknown;
    teamId?: unknown;
    type?: unknown;
    minutes?: unknown;
  };

  if (
    typeof userId !== 'string'
    || typeof teamId !== 'string'
    || typeof type !== 'string'
    || typeof minutes !== 'number'
  ) {
    throw Object.assign(new Error('Dados da atividade inválidos'), { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw Object.assign(new Error('Identificador de pessoa ou equipe inválido'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Pessoa ou equipe não encontrada'), { status: 404 });
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
  return activity.toJSON();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  if (!_input || typeof _input !== 'object') {
    throw Object.assign(new Error('Dados da equipe inválidos'), { status: 400 });
  }

  const { name, mascot, members } = _input as {
    name?: unknown;
    mascot?: unknown;
    members?: unknown;
  };

  if (typeof name !== 'string' || typeof mascot !== 'string') {
    throw Object.assign(new Error('Nome e mascote da equipe são obrigatórios'), { status: 400 });
  }

  const memberIds = members ?? [];
  if (!Array.isArray(memberIds) || memberIds.some((memberId) => typeof memberId !== 'string' || !mongoose.Types.ObjectId.isValid(memberId))) {
    throw Object.assign(new Error('Lista de integrantes inválida'), { status: 400 });
  }

  const existingMembers = await User.find({ _id: { $in: memberIds } }).select('_id');
  if (existingMembers.length !== memberIds.length) {
    throw Object.assign(new Error('Uma ou mais pessoas integrantes não foram encontradas'), { status: 404 });
  }

  const team = await Team.create({ name, mascot, members: memberIds });
  await User.updateMany(
    { _id: { $in: memberIds } },
    { $set: { team: team._id } },
  );
  return team.toJSON();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  if (totals.length === 0) return [];

  const teamIds = totals.map((entry) => entry._id);
  const teams = await Team.find({ _id: { $in: teamIds } }).lean();
  const teamNames = new Map(
    teams.map((team) => [team._id.toString(), team.name]),
  );

  return totals
    .map((entry) => ({
      teamName: teamNames.get(entry._id.toString()) ?? 'Equipe desconhecida',
      totalPoints: entry.totalPoints,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName, 'pt-BR'))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('Pessoa não encontrada'), { status: 404 });
  }

  const workouts = await Workout.find({ focus: user.fitnessGoal }).lean();
  return workouts.map((workout) => ({
    ...workout,
    reason: user.fitnessGoal === 'strength'
      ? 'Atividade compatível com seu foco de força'
      : 'Atividade compatível com seu objetivo de resistência e corrida',
  }));
}

export { User };
