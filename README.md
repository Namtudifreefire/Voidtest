# Voidtest

Automatic Test Case Generator for Programming Problems

Voidtest is a desktop application that automatically generates test cases (Input/Output) for competitive programming problems. It analyzes your C++ source code, generates diverse test inputs, compiles and runs your code to produce actual outputs, and organizes results in a structured directory.

## Features

- **Smart Code Analysis**: Parses C++ code using tree-sitter to understand input/output structure, variables, constraints, and algorithms
- **AI-Enhanced Analysis**: Optional AI integration (OpenAI-compatible) for intelligent subtask suggestions and test generation strategies
- **Diverse Test Generation**: Creates test cases including boundary values, edge cases, special patterns (sorted, reverse, duplicates), and random values
- **Real Output Generation**: Compiles your code and runs it for each test case to produce actual outputs - no guessing
- **Subtask Support**: Organize tests into subtasks with different constraints and test counts
- **Custom Naming**: Flexible file naming formats (TEST01, 01, CASE01, etc.)
- **ZIP Archive**: Optional compression of results with error reports
- **Execution Logging**: Detailed logs with levels (INFO, SUCCESS, WARNING, ERROR)
- **Test Preview**: Review generated tests before exporting
- **Cross-Platform**: Windows, macOS, and Linux support

## Installation

### Prerequisites

- Node.js 18+
- C++ compiler (g++, clang++, or MSVC) - auto-detected or configurable

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux
```

## Usage

1. **First Run**: Welcome dialog guides you through setup and output directory selection
2. **Source Code**: Paste or import your C++ solution code
3. **Analyze**: Click "Analyze Code" to parse structure and detect constraints
4. **Configure**: Review AI-suggested subtasks and adjust limits/test counts
5. **Generate**: Click "Create Tests!" to generate test cases
6. **Preview**: Review generated tests in the preview dialog
7. **Export**: Find results in your output directory (or ZIP archive)

## Configuration

### Settings

- **Output Directory**: Where to save generated test files (default: `Documents/Voidtest`)
- **AI Provider**: Configure OpenAI-compatible endpoint for enhanced analysis
- **Compiler Path**: Custom compiler path (auto-detect by default)
- **Naming Format**: Default, Numeric, or Custom Prefix
- **Theme**: Dark, Light, or System
- **Execution Log**: Enable/disable log panel

### AI Provider Setup

Voidtest supports any OpenAI-compatible API:
- **OpenAI**: `https://api.openai.com/v1` with your API key
- **Azure OpenAI**: Your Azure endpoint
- **Ollama (Local)**: `http://localhost:11434/v1` (no API key needed)
- **Custom**: Any OpenAI-compatible endpoint

## Output Structure

```
Output-test/
├── Subtask-01/
│   ├── TEST01.inp
│   ├── TEST01.out
│   ├── TEST02.inp
│   └── TEST02.out
├── Subtask-02/
│   ├── TEST01.inp
│   └── TEST01.out
└── ...
```

## License

MIT License - see LICENSE file for details.