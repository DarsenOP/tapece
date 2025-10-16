# Contributing to TapECE

Thanks for your interest in improving TapECE! This project follows standard open-source practices to keep things collaborative and fun. All contributions are welcome: code, docs, bug reports, or ideas.

## Code of Conduct
This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful and inclusive.

## How to Contribute
1. **Fork and Clone**: Fork the repo, clone it locally (`git clone https://github.com/yourusername/tapece.git`).
2. **Branch**: Create a feature branch (`git checkout -b feature/my-awesome-fix`).
3. **Develop**: 
   - Follow the tech stack: Python (SymPy/NetworkX for backend solvers), React (frontend UI).
   - For solvers: Add tests with sample circuits (e.g., voltage divider JSON).
   - Keep symbolic/numerical checks in mind—see README for MVP details.
   - Style: PEP8 (Python), ESLint (JS).
4. **Test**: Run local tests (add via pytest for backend; Jest for frontend). Ensure no regressions in KCL/nodal analysis.
5. **Commit**: Use clear messages (e.g., "fix: Handle floating nodes in nodal analysis").
6. **Pull Request**: Open a PR against `main`. Fill the template. Reference issues (e.g., "Closes #42").
7. **Review**: We'll review ASAP—aim for <1 week. Be open to feedback.

## Reporting Bugs or Features
Use GitHub Issues with the templates:
- Bugs: Detailed steps, expected vs. actual.
- Features: Tie to ECE use cases (e.g., better dependent source UX).

## Development Setup
- Backend: `pip install -r requirements.txt` (add SymPy, etc.).
- Frontend: `npm install`.
- Run: `python backend/solver.py` for tests; `npm start` for UI.
- ECE-Specific: Test with real circuits—focus on accuracy for Ohm's Law, sign conventions.

## Questions?
Ask in Issues or Discussions. For bigger ideas, open an Issue first.

Your contributions make ECE tools better—let's build!
