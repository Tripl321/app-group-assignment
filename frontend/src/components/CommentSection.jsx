import { useState, useEffect } from "react"
import { BASE_URL } from "../api"

export const CommentSection = ({ messageId, user, onUnauthorized }) => {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const fetchComments = () => {
    setLoadingComments(true)
    fetch(`${BASE_URL}/messages/${messageId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data))
      .catch(() => {})
      .finally(() => setLoadingComments(false))
  }

  useEffect(() => {
    fetchComments()
  }, [messageId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch(`${BASE_URL}/messages/${messageId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.response?.accessToken}`,
        },
        body: JSON.stringify({ text: newComment }),
      })

      if (res.status === 401) {
        onUnauthorized()
        setSubmitting(false)
        return
      }

      setNewComment("")
      await fetchComments()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const topLevelComments = comments.filter((c) => !c.parentComment)
  const replies = comments.filter((c) => c.parentComment)

  const getReplies = (commentId) =>
    replies.filter((r) => r.parentComment === commentId)

  return (
    <div className="comment-section">
      <hr className="comment-divider" />
      <p className="comment-heading">Kommentarer ({comments.length})</p>

      {loadingComments ? (
        <p className="comment-loading">Laddar kommentarer...</p>
      ) : (
        <div className="comment-list">
          {topLevelComments.map((comment) => (
            <div key={comment._id} className="comment-item">
              <div className="comment-content">
                <span className={`comment-user${!comment.user ? " comment-user-karen" : ""}`}>
                  {comment.user ? comment.user.username : "Karen"}
                </span>
                <span className="comment-text">{comment.text}</span>
              </div>
              {getReplies(comment._id).map((reply) => (
                <div key={reply._id} className="comment-item comment-reply">
                  <div className="comment-content">
                    <span className={`comment-user${!reply.user ? " comment-user-karen" : ""}`}>
                      {reply.user ? reply.user.username : "Karen"}
                    </span>
                    <span className="comment-text">{reply.text}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {user && (
        <form className="comment-form" onSubmit={handleSubmit}>
          <input
            className="comment-input"
            type="text"
            placeholder="Skriv en kommentar..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={280}
          />
          <button
            type="submit"
            className="comment-submit"
            disabled={submitting || !newComment.trim()}
          >
            Skicka
          </button>
        </form>
      )}
    </div>
  )
}
