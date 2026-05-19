import { useState, useEffect } from "react"
import { BASE_URL } from "./api"
import { PostMessage } from "./components/PostMessage"
import { MessageList } from "./components/MessageList"
import { AuthModal } from "./components/AuthModal"

export const App = () => {
  // When a component's state changes, React automatically triggers a re-render of the component to reflect the updated state in the UI.
  // Here we set our states for App.js:
  const [loading, setLoading] = useState(false) // Initial state is false, no loading
  const [messageList, setMessageList] = useState([]) // Initial state is an empty array
  const [user, setUser] = useState(null)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState(null)

  // When fetchPosts sets the loading or messageList state, it triggers a re-render of the App component.
  // We call the messages in the API, by GET method:
  const fetchPosts = () => {
    setLoading(true)
    fetch(`${BASE_URL}/messages`)
      .then((res) => res.json())
      .then((data) => setMessageList(data))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }
  // useEffect for fetchPosts is triggered only on mount because of the empty array argument
  // The useEffect hook is used to call the fetchPosts function and update the messageList state with the data retrieved from the API.
  useEffect(() => {
    fetchPosts()
  }, [])

    const addNewPost = (newMessage) => {
    setMessageList([newMessage, ...messageList])
  }

  const handleUnauthorized = () => {
    setUser(null)
    setError("Your session has expired, please log in again")
  }
    
  return (
    <>
        {user ? (
          <div className="user-info">
            <span>{user.response.username}</span>
            <button
              onClick={() => setUser(null)}
              className="auth-button"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            <button
              onClick={() => setModal("login")}
              className="auth-button"
            >
              Login
            </button>
            <button
              onClick={() => setModal("register")}
              className="auth-button"
            >
              Register
            </button>
          </div>
        )}
      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={(data) => { 
            console.log("User logged in:", data)  // ← Exposes full user object with token to devtools
            setUser(data) 
            setModal(null) 
          }}
        />
      )}
      {error && <p className="error">{error}</p>}
      <PostMessage newMessage={addNewPost} fetchPosts={fetchPosts} user={user} onUnauthorized={handleUnauthorized} />
      <MessageList
        loading={loading}
        messageList={messageList}
        setMessageList={setMessageList}
        fetchPosts={fetchPosts}
        user={user}
        onUnauthorized={handleUnauthorized}
      />
    </>
  )
}
