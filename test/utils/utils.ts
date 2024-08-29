import { AutocompleteOption, AutocompleteOptionType } from "../../index";

function containsOptionType(
  options: AutocompleteOption[],
  type: AutocompleteOptionType
): boolean {
  for (const option of options) {
    if (option.optionType === type) {
      return true;
    }
  }
  return false;
}

function containsOption(
  options: AutocompleteOption[],
  type: AutocompleteOptionType,
  value: string | null
): boolean {
  for (const option of options) {
    if (option.optionType === type && option.value === value) {
      return true;
    }
  }
  return false;
}

function allKeywordsBeginWith(
  options: AutocompleteOption[],
  value: string
): boolean {
  value = value.toUpperCase();
  for (const option of options) {
    if (
      option.optionType === AutocompleteOptionType.KEYWORD &&
      !option.value.startsWith(value)
    ) {
      return false;
    }
  }
  return true;
}

export { allKeywordsBeginWith, containsOption, containsOptionType };
