import { useState } from "react"
import PropTypes from "prop-types"
import { BASE_URL } from "../api"

export const PostMessage = ({ newMessage, fetchPosts, user, onUnauthorized }) => {
  const [newPost, setNewPost] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleFormSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch(`${BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.response?.accessToken}`,
        },
        body: JSON.stringify({ message: newPost }),
      })

      // [KRAV K4] Borttagen: console.log("Token being sent:", user?.response?.accessToken)
      // Motivering: JWT-token skrevs ut i klartext i webbläsarens konsol.
      // Vem som helst med DevTools öppna kunde kopiera token och agera som den inloggade användaren. Känslig data ska ALDRIG loggas i frontend.

      if (res.status === 401) {
        onUnauthorized()
        setSubmitting(false)
        return
      }

      const data = await res.json()

      if (data.message && !data._id) {
        // [KRAV K4] Borttagen: console.log(data): läckte serverdata
        setErrorMessage(data.message)
        setSubmitting(false)
        return
      }

      newMessage(data)
      setNewPost("")
      setErrorMessage("")
      setSubmitting(false)
      await fetchPosts()
    } catch (error) {
      console.error(error)
      setSubmitting(false)
    }
  }

  if (!user) {
    return <p id="login-prompt">Log in to write a message</p>
  }

  return (
    <div id="post-form-wrapper" className="post-wrapper">
      <p>What's making you happy right now?</p>
      <form id="post-form" onSubmit={handleFormSubmit}>
        <textarea
          id="post-textarea"
          rows="3"
          placeholder="Write your message here..."
          value={newPost}
          onChange={(e) => {
            setNewPost(e.target.value)
            setErrorMessage("")
          }}
          // [KRAV K2] Frontend-validering som komplement till backend.
          // maxLength hindrar användaren från att skriva mer än 140 tecken.
          // OBS: Detta är INTE säkerhetsskyddet, det sitter i Mongoose-schemat.
          maxLength={140}
        />
        <p className="error" id="post-error">{errorMessage}</p>
        <button
          type="submit"
          id="submit-post-btn"
          aria-label="button for submitting your post"
          disabled={submitting}
        >
          <span className="emoji">&#x2665;</span>
          {' Send message '}
          <span className="emoji">&#x2665;</span>
        </button>
      </form>
    </div>
  )
}

PostMessage.propTypes = {
  newMessage: PropTypes.func.isRequired,
  fetchPosts: PropTypes.func.isRequired,
  user: PropTypes.shape({
    response: PropTypes.shape({
      accessToken: PropTypes.string,
    }),
  }),
  onUnauthorized: PropTypes.func.isRequired,
}
