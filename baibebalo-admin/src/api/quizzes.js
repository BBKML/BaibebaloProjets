import apiClient from './client';

export const quizzesAPI = {
  // Obtenir les quiz disponibles
  getQuizzes: async (type) => {
    const response = await apiClient.get('/admin/quizzes', {
      params: { type },
    });
    return response.data;
  },

  // Soumettre les réponses d'un quiz
  submitQuiz: async (quizId, answers, userId, userType) => {
    const response = await apiClient.post('/admin/quizzes/submit', {
      quiz_id: quizId,
      answers,
      user_id: userId,
      user_type: userType,
    });
    return response.data;
  },
};
