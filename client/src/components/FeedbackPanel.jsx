import {
  useCallback,
  useEffect,
  useState
} from 'react';

import { useTranslation } from 'react-i18next';

import { feedbackApi } from '../api/resources';
import { useAuth } from '../context/AuthContext';

export default function FeedbackPanel({
  targetType,
  targetId
}) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [reviews, setReviews] = useState([]);

  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0
  });

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [submitted, setSubmitted] =
    useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;

    setLoading(true);
    setError('');

    try {
      const feedbackResponse =
        targetType === 'request'
          ? await feedbackApi.forRequest(targetId)
          : await feedbackApi.forDonation(targetId);

      // Your Axios interceptor already returns response.data.
      // Backend shape:
      // {
      //   success: true,
      //   data: [...]
      // }
      const feedbackList =
        Array.isArray(feedbackResponse?.data)
          ? feedbackResponse.data
          : [];

      setReviews(feedbackList);

      const totalReviews = feedbackList.length;

      const averageRating =
        totalReviews > 0
          ? feedbackList.reduce(
              (sum, review) =>
                sum + Number(review.rating || 0),
              0
            ) / totalReviews
          : 0;

      setSummary({
        averageRating:
          Math.round(averageRating * 10) / 10,
        totalReviews
      });

      const alreadySubmitted =
        feedbackList.some((review) => {
          const reviewUserId =
            review.userId?._id ||
            review.userId;

          return (
            reviewUserId &&
            user?._id &&
            String(reviewUserId) ===
              String(user._id)
          );
        });

      setSubmitted(alreadySubmitted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    targetId,
    targetType,
    user?._id
  ]);

  useEffect(() => {
    setNotice('');
    setComment('');
    setRating(5);

    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      await feedbackApi.create({
        targetType,
        targetId,
        rating: Number(rating),
        comment
      });

      setSubmitted(true);

      setNotice(
        t('feedback.success')
      );

      setComment('');

      await load();
    } catch (err) {
      setError(err.message);

      if (
        /already submitted/i.test(
          err.message
        )
      ) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bb-feedback-panel">
      <div className="bb-feedback-summary">
        <strong>
          {summary.averageRating
            ? `${summary.averageRating}/5`
            : t('feedback.noRating')}
        </strong>

        <span>
          {t('feedback.reviewCount', {
            count: summary.totalReviews
          })}
        </span>
      </div>

      {!submitted && (
        <form
          className="bb-feedback-form"
          onSubmit={handleSubmit}
        >
          <label>
            {t('feedback.rating')}

            <select
              value={rating}
              onChange={(e) =>
                setRating(e.target.value)
              }
              disabled={submitting}
            >
              {[5, 4, 3, 2, 1].map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value} / 5
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            {t('feedback.comment')}

            <textarea
              value={comment}
              onChange={(e) =>
                setComment(e.target.value)
              }
              maxLength={1000}
              rows="3"
              disabled={submitting}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? t('feedback.submitting')
              : t('feedback.submit')}
          </button>
        </form>
      )}

      {submitted && !notice && (
        <p className="muted">
          {t('feedback.alreadySubmitted')}
        </p>
      )}

      {notice && (
        <div className="alert success">
          {notice}
        </div>
      )}

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="muted">
          {t('common.loading')}
        </div>
      ) : reviews.length === 0 ? (
        <div className="muted">
          {t('feedback.noReviews')}
        </div>
      ) : (
        <div className="bb-feedback-list">
          {reviews.map((review) => (
            <article
              className="bb-feedback-review"
              key={review._id}
            >
              <div className="bb-feedback-review-head">
                <strong>
                  {review.userId?.name ||
                    t('feedback.user')}
                </strong>

                <span>
                  {review.rating}/5
                </span>
              </div>

              {review.comment && (
                <p>{review.comment}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
