const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { cosineSimilarity, vectorizeSkills } = require('../utils/ml');

router.post('/find', async (req, res) => {
  const { userId, skillsHave, skillsWant } = req.body;

  try {
    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const users = await User.find({ _id: { $ne: userId } });

    let perfectMatch = null;
    const candidates = [];

    for (const other of users) {
      const teaches = other.skillsHave.map(s => s.toLowerCase());
      const learns = other.skillsWant.map(s => s.toLowerCase());

      const teachMatch = skillsWant.some(skill => teaches.includes(skill.toLowerCase()));
      const learnMatch = skillsHave.some(skill => learns.includes(skill.toLowerCase()));

      if (teachMatch && learnMatch) {
        perfectMatch = other;
        break;
      }

      candidates.push({
        user: other,
        teachVector: vectorizeSkills(teaches),
        learnVector: vectorizeSkills(learns)
      });
    }

    if (perfectMatch) {
      return res.json({
        perfectMatch: true,
        partnerId: perfectMatch._id,
        partnerName: perfectMatch.name
      });
    }

    const userTeachVec = vectorizeSkills(skillsHave);
    const userLearnVec = vectorizeSkills(skillsWant);

    const similarMatches = candidates.map(({ user, teachVector, learnVector }) => {
      const scoreA = cosineSimilarity(userTeachVec, learnVector);
      const scoreB = cosineSimilarity(userLearnVec, teachVector);
      const total = (scoreA + scoreB) / 2;
      return { id: user._id, name: user.name, score: total };
    }).filter(match => match.score > 0.1) // 👈 lowered threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    console.log("SkillsHave:", skillsHave);
    console.log("SkillsWant:", skillsWant);
    console.log("Top similar matches:", similarMatches);

    res.json({ perfectMatch: false, similarMatches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
