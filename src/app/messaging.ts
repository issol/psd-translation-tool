// @webtoon/psd
// Copyright 2021-present NAVER WEBTOON
// MIT License

import Psd, { Group, NodeChild } from '@webtoon/psd'
import { BalloonType } from './workspace/page'
import { Dispatch, SetStateAction } from 'react'
import { Psd as AgPsd, Layer as AgLayer } from 'ag-psd'

// This file provides interfaces and validators for message objects passed
// between the main window and the worker.

export type BoxType = {
  left: number
  top: number
  /** Parsed layer name */
  name: string
}

/** Unique signature */
const SIGNATURE = 'this-is-a-message'

interface ExampleMessageBase<Type extends string, Value> {
  type: Type
  value: Value
  signature: typeof SIGNATURE
  /** Time at which the message was created (not necessarily when it was sent) */
  timestamp: number
}

/**
 * Message that requests the server to parse an ArrayBuffer as a PSD file.
 * This is meant to be sent by the main thread to the worker.
 */
export type ParsePsdMessage = ExampleMessageBase<'ParseData', ArrayBuffer>

/**
 * Message that contains the main image of a PSD file as an {@link ImageData}
 * object.
 * This is meant to be sent by the worker back to the main thread.
 */
export type MainImageDataMessage = ExampleMessageBase<
  'MainImageData',
  {
    pixelData: Uint8ClampedArray
    width: number
    height: number
    layerCount: number
    psd: AgPsd
  }
>

/**
 * Message that contains the information and image of a layer, parsed from a PSD
 * file.
 * This is meant to be sent by the worker back to the main thread.
 */
export type LayerMessage = ExampleMessageBase<
  'Layer',
  {
    pixelData: Uint8ClampedArray
    left: number
    top: number
    width: number
    height: number
    type: string
    /** Parsed layer name */
    name: string
    // originalWidth: number
    // group: Group
    // index: number
    // lastIndex: number
  }
>

export type ChildrenMessage = ExampleMessageBase<'Children', AgLayer>

export type GroupMessage = ExampleMessageBase<
  'Group',
  {
    box: Array<BoxType>
    group?: AgLayer
    originalWidth: number
  }
>
export type WriteFileMessage = ExampleMessageBase<
  'WriteFile',
  {
    originalFile: {
      pixelData: Uint8ClampedArray
      width: number
      height: number
      layerCount: number
      psd: AgPsd
    } | null
    box: BalloonType[]
    group: AgLayer[] | null
    image: ImageBitmap
  }
>

export type DownloadFileMessage = ExampleMessageBase<'DownloadFile', Blob>

export type ExampleMessage =
  | LayerMessage
  | MainImageDataMessage
  | ParsePsdMessage
  | GroupMessage
  | WriteFileMessage
  | DownloadFileMessage
  | ChildrenMessage

/**
 * Checks if a value is an {@link ExampleMessage}.
 * This is meant to be used to check the
 * @param data
 */
export function validateMessage(data: unknown): asserts data is ExampleMessage {
  if (
    !(
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      'value' in data &&
      (data as ExampleMessage)['signature'] === SIGNATURE
    )
  ) {
    throw new TypeError(`data is not an ExampleMessage (got ${data})`)
  }

  // Check if the "type" field contains known message types

  const type = (data as ExampleMessage).type
  switch (type) {
    case 'Layer':
    case 'MainImageData':
    case 'ParseData':
    case 'Group':
    case 'WriteFile':
    case 'DownloadFile':
    case 'Children':
      // These are valid, so pass
      return
    default:
      // Will fail type check if switch statement is non-exhaustive
      ;((value: never) => {
        throw new TypeError(`Unexpected ExampleMessage type: ${value}`)
      })(type)
  }
}

/**
 * Creates a message object with the given type and value.
 * @param type
 * @param value
 */
export function createMessage<Type extends ExampleMessage['type']>(
  type: Type,
  value: Extract<ExampleMessage, { type: Type }>['value'],
): Extract<ExampleMessage, { type: Type }> {
  return {
    type,
    value,
    signature: SIGNATURE,
    timestamp: Date.now(),
  } as Extract<ExampleMessage, { type: Type }>
}
