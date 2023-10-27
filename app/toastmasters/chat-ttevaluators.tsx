import React, { useState, useRef, useEffect, use } from "react";
import _ from "lodash";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store";

import styles_chat from "../components/chat.module.scss";
import styles_tm from "./toastmasters.module.scss";
import { List, showPrompt, showToast } from "../components/ui-lib";
import { IconButton } from "../components/button";

import {
  ToastmastersTTEvaluatorsGuidance as ToastmastersRoleGuidance,
  ToastmastersTTEvaluatorsRecord as ToastmastersRecord,
  InputSubmitStatus,
  ToastmastersRoles,
} from "./roles";
import {
  ChatTitle,
  ChatInput,
  ChatResponse,
  ChatUtility,
  ChatSubmitRadiobox,
} from "./chat-common";
import { InputTableRow } from "../store/chat";

import AddIcon from "../icons/add.svg";
import CloseIcon from "../icons/close.svg";
import MenuIcon from "../icons/menu.svg";

import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButtonMui from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { SpeechAvatarVideoShow } from "../cognitive/speech-avatar";
import { EN_MASKS } from "../masks/en";
import { Mask } from "../store/mask";
import { useScrollToBottom } from "../components/chat";

export function Chat() {
  const chatStore = useChatStore();
  const [session, sessionIndex] = useChatStore((state) => [
    state.currentSession(),
    state.currentSessionIndex,
  ]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 设置自动滑动窗口
  const { scrollRef, setAutoScroll, scrollToBottom } = useScrollToBottom();
  const [hitBottom, setHitBottom] = useState(true);

  const checkInput = (): InputSubmitStatus => {
    if (session.input.datas.length === 0) {
      showToast(`Input Table is empty, please check`);
      return new InputSubmitStatus(false, "");
    }

    const isAllValid = session.input.datas.every((row) => {
      let question = row.question.text.trim();
      let speech = row.speech.text.trim();
      if (question === "" || speech === "") {
        showToast(`${row.speaker}: Question or Speech is empty, please check`);
        return false;
      }
      return true;
    });

    if (!isAllValid) {
      return new InputSubmitStatus(false, "");
    }

    var guidance = ToastmastersRoleGuidance(getInputsString());
    return new InputSubmitStatus(true, guidance);
  };

  const getInputsString = (): string => {
    // inputTable
    const speakerInputs = session.input.datas?.map((row) => ({
      Speaker: row.speaker,
      Question: row.question.text,
      Speech: row.speech.text,
      SpeechTime: ChatUtility.formatTime(row.speech.time),
    }));
    // 4 是可选的缩进参数，它表示每一层嵌套的缩进空格数
    const speakerInputsString = JSON.stringify(speakerInputs, null, 4);
    return speakerInputsString;
  };

  const addItem = () => {
    setAutoScroll(false);
    const newItem: InputTableRow = {
      speaker: `Speaker${session.input.datas.length + 1}`,
      question: { text: "", time: 0 },
      speech: { text: "", time: 0 },
    };
    var newInputBlocks = [...session.input.datas, newItem];
    chatStore.updateCurrentSession(
      (session) => (session.input.datas = newInputBlocks),
    );
  };

  return (
    <div className={styles_chat.chat} key={session.id}>
      <ChatTitle getInputsString={getInputsString}></ChatTitle>
      <div
        className={styles_chat["chat-body"]}
        ref={scrollRef}
        onMouseDown={() => inputRef.current?.blur()}
        // onWheel={(e) => setAutoScroll(hitBottom && e.deltaY > 0)}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        <div className={styles_tm["chat-input-button-add-row"]}>
          <IconButton
            icon={<AddIcon />}
            text="Add Speaker"
            onClick={addItem}
            className={styles_tm["chat-input-button-add"]}
          />
        </div>
        {session.input.datas.length > 0 && (
          <>
            <div style={{ padding: "0px 20px" }}>
              <ChatTable />
            </div>
            <ChatSubmitRadiobox
              toastmastersRecord={ToastmastersRecord}
              checkInput={checkInput}
              updateAutoScroll={setAutoScroll}
            />
          </>
        )}
        {/* 3 is the predifined message length */}
        {session.input.roles.length > 0 && (
          <ChatResponse
            scrollRef={scrollRef}
            toastmastersRecord={ToastmastersRecord}
          />
        )}

        <SpeechAvatarVideoShow outputAvatar={session.output.avatar} />
      </div>
    </div>
  );
}

function ChatTable() {
  const chatStore = useChatStore();
  const [session, sessionIndex] = useChatStore((state) => [
    state.currentSession(),
    state.currentSessionIndex,
  ]);

  // TODO: deleteItem执行时, speakerInputsString 并未及时变化, 导致Export结果又不对
  // 此时需要刷新页面, 才能看到正确的结果
  const deleteItem = (row_index: number) => {
    chatStore.updateCurrentSession((session) =>
      session.input.datas.splice(row_index, 1),
    );
  };

  const renameSpeaker = (row: InputTableRow) => {
    showPrompt("Rename", row.speaker).then((newName) => {
      if (newName && newName !== row.speaker) {
        chatStore.updateCurrentSession((session) => (row.speaker = newName));
      }
    });
  };

  function Row(props: { row: InputTableRow; row_index: number }) {
    const { row, row_index } = props;
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();

    const onDetailClick = () => {
      const mask = EN_MASKS.find(
        (mask) => mask.name === ToastmastersRoles.TableTopicsEvaluator,
      ) as Mask;

      chatStore.newSession(mask);
      navigate(mask.pagePath as any);

      // new session has index 0
      chatStore.updateSession(0, (session) => {
        session.topic = row.speaker;
        session.input.data.question = { ...row.question };
        session.input.data.speech = { ...row.speech };
        return session;
      });
    };

    return (
      <React.Fragment>
        <TableRow
          sx={{ "& > *": { borderBottom: "unset" } }}
          onClick={() => setOpen(!open)}
        >
          <TableCell>
            <IconButtonMui
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButtonMui>
          </TableCell>
          <TableCell component="th" scope="row">
            <div
              className={`${styles_tm["chat-input-speaker"]}`}
              onClickCapture={() => {
                renameSpeaker(row);
              }}
            >
              {row.speaker}
            </div>
          </TableCell>
          <TableCell align="left">
            {ChatUtility.getFirstNWords(row.question.text, 10)}
          </TableCell>
          <TableCell align="left">
            {ChatUtility.getFirstNWords(row.speech.text, 10)}
          </TableCell>
          <TableCell align="left">
            {ChatUtility.formatTime(row.speech.time)}
          </TableCell>
          <TableCell align="left">
            <div className={styles_tm["table-actions"]}>
              <IconButton icon={<MenuIcon />} onClick={onDetailClick} />
              <IconButton
                icon={<CloseIcon />}
                onClick={() => deleteItem(row_index)}
              />
            </div>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <List>
                  <ChatInput title="Question" inputStore={row.question} />
                  <ChatInput
                    title="Table Topics Speech"
                    inputStore={row.speech}
                    showTime={true}
                  />
                </List>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </React.Fragment>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table
        aria-label="collapsible table"
        className={styles_tm["table-border"]}
      >
        <TableHead>
          <TableRow>
            <TableCell style={{ width: "10px" }} />
            <TableCell
              align="left"
              className={styles_tm["table-header"]}
              style={{ width: "100px" }}
            >
              Speaker
            </TableCell>
            <TableCell align="left" className={styles_tm["table-header"]}>
              Question
            </TableCell>
            <TableCell align="left" className={styles_tm["table-header"]}>
              Speech
            </TableCell>
            <TableCell align="left" className={styles_tm["table-header"]}>
              SpeechTime
            </TableCell>
            <TableCell
              align="left"
              className={styles_tm["table-header"]}
              style={{ width: "100px" }}
            >
              Action
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {session.input.datas.map((row, index) => (
            <Row key={index} row={row} row_index={index} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
