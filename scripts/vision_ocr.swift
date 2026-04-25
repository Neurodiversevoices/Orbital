#!/usr/bin/swift
// macOS Vision OCR — reads a screenshot and prints all recognized text lines.
// Usage: swift scripts/vision_ocr.swift <path-to-screenshot.png>
import Vision
import CoreImage
import Foundation

guard CommandLine.arguments.count >= 2 else {
  fputs("Usage: swift vision_ocr.swift <image-path>\n", stderr)
  exit(1)
}

let path = CommandLine.arguments[1]
guard let image = CIImage(contentsOf: URL(fileURLWithPath: path)) else {
  fputs("Cannot load image: \(path)\n", stderr)
  exit(2)
}

let handler = VNImageRequestHandler(ciImage: image, options: [:])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false

do {
  try handler.perform([request])
} catch {
  fputs("Vision error: \(error)\n", stderr)
  exit(3)
}

let observations: [VNRecognizedTextObservation] = request.results ?? []
let lines = observations
  .compactMap { $0.topCandidates(1).first?.string }
lines.forEach { print($0) }
