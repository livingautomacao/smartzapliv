'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

const panelClass = 'rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_12px_30px_rgba(0,0,0,0.35)]'

interface StepNavigationProps {
  step: number
  setStep: React.Dispatch<React.SetStateAction<number>>
  canContinue: boolean
  isConfigComplete: boolean
  isContentComplete: boolean
  isButtonsValid: boolean
  onFinish?: () => void
  isFinishing?: boolean
  showDebug: boolean
  setShowDebug: React.Dispatch<React.SetStateAction<boolean>>
  // Validation states for messages
  isHeaderFormatValid: boolean
  isHeaderVariableValid: boolean
  hasInvalidNamed: boolean
  hasDuplicateNamed: boolean
  hasMissingPositional: boolean
  hasInvalidPositional: boolean
  footerHasVariables: boolean
  headerEdgeParameter: { starts: boolean; ends: boolean }
  bodyEdgeParameter: { starts: boolean; ends: boolean }
  hasLengthErrors: boolean
  ltoHeaderInvalid: boolean
  ltoFooterInvalid: boolean
  buttonErrors: string[]
  carouselErrors: string[]
  limitedTimeOfferCategoryInvalid: boolean
  limitedTimeOfferTextTooLong: boolean
  ltoCopyCodeMissing: boolean
  ltoCopyCodeTooLong: boolean
}

export function StepNavigation({
  step,
  setStep,
  canContinue,
  isConfigComplete,
  isContentComplete,
  isButtonsValid,
  onFinish,
  isFinishing,
  showDebug,
  setShowDebug,
  isHeaderFormatValid,
  isHeaderVariableValid,
  hasInvalidNamed,
  hasDuplicateNamed,
  hasMissingPositional,
  hasInvalidPositional,
  footerHasVariables,
  headerEdgeParameter,
  bodyEdgeParameter,
  hasLengthErrors,
  ltoHeaderInvalid,
  ltoFooterInvalid,
  buttonErrors,
  carouselErrors,
  limitedTimeOfferCategoryInvalid,
  limitedTimeOfferTextTooLong,
  ltoCopyCodeMissing,
  ltoCopyCodeTooLong,
}: StepNavigationProps) {
  return (
    <div className={`${panelClass} px-5 py-4`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1}
          className={`text-sm transition ${step === 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
        >
          Voltar
        </button>
        <div className="text-center text-xs text-gray-500">
          {step === 1 && !isConfigComplete && 'Complete a configuracao para continuar'}
          {step === 2 && !isContentComplete && (
            !isHeaderFormatValid
              ? 'Tipo de cabecalho invalido'
              : !isHeaderVariableValid
                ? 'Cabecalho permite apenas 1 variavel'
                : hasInvalidNamed
                  ? 'Corrija as variaveis: use minusculas e underscore'
                : hasDuplicateNamed
                  ? 'Nomes de variavel devem ser unicos'
                : hasMissingPositional
                  ? 'Sequencia posicional deve comecar em {{1}} e nao ter buracos'
                : hasInvalidPositional
                  ? 'No modo numerico, use apenas {{1}}, {{2}}...'
                : footerHasVariables
                  ? 'Rodape nao permite variaveis'
                : headerEdgeParameter.starts || headerEdgeParameter.ends
                  ? 'O cabecalho nao pode comecar nem terminar com variavel'
                : bodyEdgeParameter.starts || bodyEdgeParameter.ends
                  ? 'O corpo nao pode comecar nem terminar com variavel'
                : hasLengthErrors
                  ? 'Revise os limites de caracteres'
                : ltoHeaderInvalid
                  ? 'LTO aceita apenas cabecalho imagem/video'
                : ltoFooterInvalid
                  ? 'LTO nao permite rodape'
                : 'Preencha o corpo do template para continuar'
          )}
          {step === 3 && (
            isButtonsValid
              ? 'Reveja os botoes e envie para aprovacao'
              : buttonErrors.length
                ? 'Revise as regras dos botoes'
                : carouselErrors.length
                  ? 'Revise o carousel'
                  : limitedTimeOfferCategoryInvalid
                    ? 'LTO so e permitido em Marketing'
                    : limitedTimeOfferTextTooLong || ltoCopyCodeMissing || ltoCopyCodeTooLong || ltoHeaderInvalid || ltoFooterInvalid
                      ? 'Revise o Limited Time Offer'
                      : 'Revise as regras do template'
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!canContinue || isFinishing) return
            if (step < 3) {
              setStep((prev) => Math.min(3, prev + 1))
              return
            }
            // Ultimo passo: delega a acao ao pai (ex.: salvar + enviar)
            onFinish?.()
          }}
          disabled={!canContinue || !!isFinishing}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            !isFinishing && canContinue
              ? 'bg-white text-black hover:bg-gray-200'
              : 'cursor-not-allowed border border-white/10 bg-white/10 text-gray-500'
          }`}
        >
          {step < 3 ? (
            'Continuar'
          ) : isFinishing ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando pra Meta...
            </span>
          ) : (
            (onFinish ? 'Enviar pra Meta' : 'Fim')
          )}
        </button>
      </div>
    </div>
  )
}
