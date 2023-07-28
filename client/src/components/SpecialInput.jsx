import React, { useState } from "react";

const EditableText = ({
  text,
  handleChange,
  enableEdit = true,
  enableCopy = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  //   <div class="input-group">
  //   <input type="text" class="form-control" placeholder="Recipient's username" aria-label="Recipient's username with two button addons">
  //   <button class="btn btn-outline-secondary" type="button">Button</button>
  //   <button class="btn btn-outline-secondary" type="button">Button</button>
  // </div>

  return (
    <div className="input-group my-3">
      {isEditing ? (
        <input
          type="text"
          className="form-control"
          placeholder="your secret key here"
          value={text}
          onChange={(event) => handleChange(event.target.value)}
        />
      ) : (
        <input
          type="text"
          className="form-control"
          placeholder="generate your secret unique key"
          disabled
          onChange={() => {}}
          value={text}
        />
      )}
      {isEditing ? (
        <button className="btn btn-outline-success" onClick={handleSave}>
          Save
        </button>
      ) : (
        <>
          {enableEdit && (
            <button className="btn btn-outline-secondary" onClick={handleEdit}>
              Edit
            </button>
          )}
          {enableCopy && (
            <button className="btn btn-outline-secondary" onClick={handleCopy}>
              Copy
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default EditableText;
