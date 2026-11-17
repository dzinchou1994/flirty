/**
 * Nothing renders in the modal slot unless an intercepting route matches.
 * Without this file a hard navigation to any other route 404s the slot.
 */
export default function ModalDefault() {
  return null;
}
