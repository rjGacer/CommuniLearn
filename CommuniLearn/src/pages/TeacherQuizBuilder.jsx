import React, { useState, useEffect } from "react";
import "../css/teacher.css";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function TeacherQuizBuilder() {
  const navigate = useNavigate();
  const {
    state
  } = useLocation();
  const quizId = state?.quizId;
  const moduleId = state?.moduleId;

  /* ------------------------------
      INITIALIZE QUIZ METADATA
  ------------------------------ */
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  /* ------------------------------
      INITIALIZE QUESTIONS
  ------------------------------ */
  const [questions, setQuestions] = useState([{
    type: "Multiple Choice",
    question: "",
    options: ["", ""],
    answer: "",
    points: 1,
    files: []
  }]);

  /* ============================================================
      LOAD EXISTING QUIZ WHEN EDITING
  ============================================================ */
  useEffect(() => {
    if (!state?.questions) return;

    // Load metadata
    setDescription(state.description || "");
    setTimeLimit(state.timeLimit ? String(state.timeLimit) : "");
    if (state.dueDate) {
      const parts = state.dueDate.split("T");
      const datePart = parts[0] || "";
      const timePartRaw = parts[1] ? parts[1].split("Z")[0].split("+")[0] : "";
      const timePart = timePartRaw ? timePartRaw.slice(0, 5) : "";
      // If backend used the time-only sentinel date (1970-01-01), treat as time-only
      if (datePart === "1970-01-01") {
        setDueDate("");
        setDueTime(timePart);
      } else {
        setDueDate(datePart);
        setDueTime(timePart);
      }
    } else {
      setDueDate("");
      setDueTime("");
    }

    // Load questions
    const loadedQuestions = state.questions.map(q => ({
      type: q.type,
      question: q.question,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer,
      points: q.points !== undefined ? q.points : 1,
      files: q.files ? JSON.parse(q.files) : []
    }));
    setQuestions(loadedQuestions);
  }, [state]);

  /* ============================================================
      QUESTION FUNCTIONS
  ============================================================ */

  const addQuestion = () => {
    setQuestions([...questions, {
      type: "Multiple Choice",
      question: "",
      options: ["", ""],
      answer: "",
      points: 1,
      files: []
    }]);
  };
  const removeQuestion = index => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };
  const updateQuestion = (index, key, value) => {
    const updated = [...questions];
    updated[index][key] = value;

    // Reset fields when type changes
    if (key === "type") {
      if (value === "Multiple Choice") {
        updated[index].options = ["", ""];
        updated[index].answer = "";
      } else if (value === "Identification") {
        updated[index].options = [];
        updated[index].answer = "";
      } else if (value === "Activity") {
        updated[index].options = [];
        updated[index].answer = "";
        updated[index].files = [];
      }
    }
    setQuestions(updated);
  };
  const addOption = qIndex => {
    const updated = [...questions];
    updated[qIndex].options.push("");
    setQuestions(updated);
  };
  const removeOption = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].options.splice(optIndex, 1);
    setQuestions(updated);
  };
  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };
  const handleFileUpload = (qIndex, files) => {
    const updated = [...questions];
    updated[qIndex].files = files;
    setQuestions(updated);
  };

  /* ============================================================
      SAVE QUIZ
  ============================================================ */

  const saveQuiz = async () => {
    try {
      const formData = new FormData();
      formData.append("quizId", quizId);
      formData.append("description", description);
      formData.append("timeLimit", timeLimit);
      // Combine date + time using attendance-style rules:
      // - date + time => `yyyy-mm-ddTHH:MM`
      // - date only => `yyyy-mm-dd`
      // - time only => sentinel `1970-01-01THH:MM`
      // - none => empty string
      let combinedDue = "";
      if (dueDate) {
        combinedDue = dueTime ? `${dueDate}T${dueTime}` : dueDate;
      } else if (dueTime) {
        combinedDue = `1970-01-01T${dueTime}`;
      } else {
        combinedDue = "";
      }
      formData.append("dueDate", combinedDue);

      // Save questions (exclude File objects) — include per-question points
      const questionData = questions.map(q => ({
        type: q.type,
        question: q.question,
        options: q.options,
        answer: q.answer,
        points: q.points ?? 1
      }));
      formData.append("questions", JSON.stringify(questionData));

      // Include Activity Files
      questions.forEach((q, index) => {
        if (q.type === "Activity" && Array.isArray(q.files)) {
          q.files.forEach(file => {
            if (file instanceof File) {
              formData.append(`files_q${index}`, file);
            }
          });
        }
      });
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/quizzes/save-questions", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      alert("Quiz saved!");
      // notify other tabs/components to refresh recent items
      try{ localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); }catch(e){}
      navigate("/teacher/quizzes");
    } catch (err) {
      console.error("Error saving quiz:", err);
      alert("Error saving quiz");
    }
  };

  /* ============================================================
      RENDER UI
  ============================================================ */

  return /*#__PURE__*/_jsxs("div", {
    className: "quiz-builder-container",
    children: [/*#__PURE__*/_jsx("h1", {
      children: "Quiz Builder"
    }), /*#__PURE__*/_jsxs("div", {
      className: "quiz-card",
      children: [/*#__PURE__*/_jsx("label", {
        children: "Description"
      }), /*#__PURE__*/_jsx("textarea", {
        value: description,
        onChange: e => setDescription(e.target.value)
      }), /*#__PURE__*/_jsx("label", {
        children: "Time Limit (minutes)"
      }), /*#__PURE__*/_jsx("input", {
        type: "number",
        value: timeLimit,
        onChange: e => setTimeLimit(e.target.value)
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start'
        },
        children: [/*#__PURE__*/_jsxs("div", {
          style: {
            flex: 1
          },
          children: [/*#__PURE__*/_jsx("label", {
            children: "Due Date"
          }), /*#__PURE__*/_jsx("input", {
            type: "date",
            value: dueDate,
            onChange: e => setDueDate(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            width: 170
          },
          children: [/*#__PURE__*/_jsx("label", {
            children: "Time"
          }), /*#__PURE__*/_jsx("input", {
            type: "time",
            value: dueTime,
            onChange: e => setDueTime(e.target.value)
          })]
        })]
      })]
    }), /*#__PURE__*/_jsx("h2", {
      children: "Questions"
    }), questions.map((q, i) => /*#__PURE__*/_jsxs("div", {
      className: "quiz-card",
      children: [/*#__PURE__*/_jsx("label", {
        children: "Question Text"
      }), /*#__PURE__*/_jsx("input", {
        type: "text",
        value: q.question,
        onChange: e => updateQuestion(i, "question", e.target.value),
        placeholder: "Enter question"
      }), q.type !== "Activity" && /*#__PURE__*/_jsxs("div", { className: "question-points",
        style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 },
        children: [/*#__PURE__*/_jsx("label", { style: { fontSize: 12, color: '#666', marginRight: 8 }, children: "Points" }), /*#__PURE__*/_jsx("input", { type: "number", min: 0, value: q.points ?? 1, onChange: e => updateQuestion(i, "points", Number(e.target.value)), style: { width: 72, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' } })]
      }), /*#__PURE__*/_jsx("label", {
        children: "Question Type"
      }), /*#__PURE__*/_jsxs("select", {
        value: q.type,
        onChange: e => updateQuestion(i, "type", e.target.value),
        children: [/*#__PURE__*/_jsx("option", {
          value: "Multiple Choice",
          children: "Multiple Choice"
        }), /*#__PURE__*/_jsx("option", {
          value: "Identification",
          children: "Identification"
        }), /*#__PURE__*/_jsx("option", {
          value: "Activity",
          children: "Activity"
        })]
      }), q.type === "Multiple Choice" && /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsx("label", {
          children: "Options"
        }), q.options.map((op, j) => /*#__PURE__*/_jsxs("div", {
          className: "option-row",
          children: [/*#__PURE__*/_jsx("input", {
            type: "text",
            value: op,
            placeholder: `Option ${j + 1}`,
            onChange: e => updateOption(i, j, e.target.value)
          }), /*#__PURE__*/_jsx("button", {
            className: "delete-option-btn",
            onClick: () => removeOption(i, j),
            children: "\u2715"
          })]
        }, j)), /*#__PURE__*/_jsx("button", {
          className: "add-option-btn",
          onClick: () => addOption(i),
          children: "+ Add Option"
        }), /*#__PURE__*/_jsx("label", {
          children: "Correct Answer"
        }), /*#__PURE__*/_jsxs("select", {
          value: q.answer,
          onChange: e => updateQuestion(i, "answer", e.target.value),
          children: [/*#__PURE__*/_jsx("option", {
            value: "",
            children: "-- Select Answer --"
          }), q.options.map((op, j) => /*#__PURE__*/_jsx("option", {
            value: op,
            children: op
          }, j))]
        })]
      }), q.type === "Identification" && /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsx("label", {
          children: "Correct Answer"
        }), /*#__PURE__*/_jsx("input", {
          type: "text",
          value: q.answer,
          placeholder: "Correct answer",
          onChange: e => updateQuestion(i, "answer", e.target.value)
        })]
      }), q.type === "Activity" && /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsx("label", {
          children: "Upload File(s)"
        }), /*#__PURE__*/_jsx("input", {
          type: "file",
          multiple: true,
          onChange: e => handleFileUpload(i, Array.from(e.target.files || []))
        }), Array.isArray(q.files) && q.files.map((file, idx) => typeof file === "string" && /*#__PURE__*/_jsxs("p", {
          style: {
            fontSize: "14px"
          },
          children: ["\uD83D\uDCC4 Existing File:", " ", /*#__PURE__*/_jsx("a", {
            href: `http://localhost:5000${file}`,
            target: "_blank",
            rel: "noreferrer",
            children: file
          })]
        }, idx))]
      }), /*#__PURE__*/_jsx("div", {
        className: "question-tools",
        children: /*#__PURE__*/_jsx("button", {
          onClick: () => removeQuestion(i),
          children: "\uD83D\uDDD1 Delete"
        })
      })]
    }, i)), /*#__PURE__*/_jsxs("div", {
      className: "quiz-actions",
      children: [/*#__PURE__*/_jsx("button", {
        className: "add-option-btn",
        onClick: addQuestion,
        children: "+ Add Question"
      }), /*#__PURE__*/_jsxs("div", {
        style: {
          display: 'flex',
          gap: 12
        },
        children: [/*#__PURE__*/_jsx("button", {
          className: "save-quiz-btn",
          onClick: saveQuiz,
          children: "Save Quiz"
        }), /*#__PURE__*/_jsx("button", {
          className: "cancel-quiz-btn",
          onClick: () => navigate('/teacher/dashboard'),
          children: "Cancel"
        })]
      })]
    })]
  });
}