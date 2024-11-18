/**
 * @file Setup recording of WebSocket traffic
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import { safeJSONParse } from "./tools.js";
import { Logger } from "winston";

interface WebSocketLogEntry {
  timestamp: Date;
  url: string;
  messages: WebSocketMessage[];
}

interface WebSocketMessage {
  timestamp: number;
  io: "in" | "out";
  m: any[];
}

interface WebSocketLog {
  [requestId: string]: WebSocketLogEntry;
}

export function setup_websocket_recording(
  page: any,
  logger: Logger,
): WebSocketLog {
  // recording websockets
  // https://stackoverflow.com/a/54110660/1407622
  const webSocketLog: WebSocketLog = {};
  const client = page._client();

  client.on(
    "Network.webSocketCreated",
    ({ requestId, url }: { requestId: string; url: string }) => {
      if (!webSocketLog[requestId]) {
        webSocketLog[requestId] = {
          timestamp: new Date(),
          url: url,
          messages: [],
        };
      }
      logger.log("warn", `WebSocket opened with url ${url}`, {
        type: "WebSocket",
      });
    },
  );

  client.on(
    "Network.webSocketClosed",
    ({ requestId, timestamp }: { requestId: string; timestamp: number }) => {
      // console.log('Network.webSocketClosed', requestId, timestamp);
    },
  );

  client.on(
    "Network.webSocketFrameSent",
    ({
      requestId,
      timestamp,
      response,
    }: {
      requestId: string;
      timestamp: number;
      response: { payloadData: string };
    }) => {
      webSocketLog[requestId].messages.push({
        timestamp: timestamp,
        io: "out",
        m: response.payloadData.split("\n").map(safeJSONParse),
      });
    },
  );

  client.on(
    "Network.webSocketFrameReceived",
    ({
      requestId,
      timestamp,
      response,
    }: {
      requestId: string;
      timestamp: number;
      response: { payloadData: string };
    }) => {
      webSocketLog[requestId].messages.push({
        timestamp: timestamp,
        io: "in",
        m: response.payloadData.split("\n").map(safeJSONParse),
      });
    },
  );

  return webSocketLog;
}
