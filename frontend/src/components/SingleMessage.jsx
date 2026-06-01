import { useState } from "react"
import { BASE_URL } from "../api"

export const SingleMessage = ({ message, user, onUnauthorized, fetchPosts }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(message.message)
  const [editError, setEditError] = useState("")

  const isOwner = user && user.response.id === message.user?._id

  const onDelete = async () => {
    try {
      const res = await fetch(`${BASE_URL}/messages/${message._id}`, {
        method: "DELETE",
        headers: {
          // [KRAV K6] Token skickas med DELETE-anropet.
          // Backend kräver nu authenticateUser + ägarkontroll.
          Authorization: `Bearer ${user?.response?.accessToken}`,
        },
      })

      if (res.status === 401) {
        onUnauthorized()
        return
      }

      // [KRAV K6] Om backend returnerar 403 = användaren äger inte meddelandet
      if (res.status === 403) {
        return
      }

      await fetchPosts()
    } catch (error) {
      console.error(error)
    }
  }

  const onSave = async () => {
    try {
      const res = await fetch(`${BASE_URL}/messages/${message._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.response?.accessToken}`,
        },
        // [KRAV K2] Ändrat fältnamn från "editedMessage" till "message"
        // för att matcha backend-endpointen konsekvent.
        body: JSON.stringify({ message: editedText }),
      })

      if (res.status === 401) {
        onUnauthorized()
        return
      }

      const data = await res.json()

      if (data.error) {
        // [KRAV K4] Borttagen: console.log(data) — läckte serverdata till konsolen
        setEditError(data.error)
        return
      }

      setIsEditing(false)
      setEditError("")
      await fetchPosts()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="message" data-id={message._id}>
      <div className="message-header">
        {!isEditing && <p className="message-text">{message.message}</p>}

        {isEditing && (
          <div className="edit-wrapper">
            <label>
              <textarea
                className="edit-textarea"
                rows="3"
                value={editedText}
                onChange={(event) => {
                  setEditedText(event.target.value)
                  setEditError("")
                }}
              />
              <p className="error edit-error">{editError}</p>
            </label>
          </div>
        )}

        <div className="message-actions">
          {/* 
              [KRAV K6] Delete-knappen villkorad med isOwner
              FÖRE: <button className="delete-btn" onClick={onDelete}>🗑️</button>
                - Synlig för ALLA användare, oavsett om de ägde meddelandet
              EFTER: Visas bara om isOwner === true
                - Samma mönster som edit-knappen redan använde
              OBS: Detta är bara UI-skydd. Det riktiga skyddet sitter i backend
              (authenticateUser + ägarkontroll). En angripare kan fortfarande
              skicka ett DELETE-anrop via curl, men backend stoppar det.
              */}
          {isOwner && (
            <button type="button" className="delete-btn" onClick={onDelete}>🗑️</button>
          )}

          {isOwner && !isEditing && (
            <button type="button" className="edit-btn" onClick={() => setIsEditing(true)}>✏️</button>
          )}

          {isOwner && isEditing && (
            <button type="button" className="save-btn" onClick={onSave}>💾</button>
          )}

          {isOwner && isEditing && (
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setIsEditing(false)
                setEditError("")
              }}
            >
              ❌
            </button>
          )}
        </div>
      </div>

      <div className="info-wrapper">
        <div className="info-user">{message.user?.username || ""}</div>
      </div>
    </div>
  )
}
