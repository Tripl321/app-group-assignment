import { SingleMessage } from "./SingleMessage"

export const MessageList = ({ loading, messageList, user, onUnauthorized, fetchPosts }) => {
  if (loading) {
    return <div id="message-list"><div className="spinner"></div></div>
  }

  return (
    <div id="message-list">
      {messageList.map((message) => (
        <SingleMessage
          key={message._id}
          message={message}
          user={user}
          onUnauthorized={onUnauthorized}
          fetchPosts={fetchPosts}
        />
      ))}
    </div>
  )
}
