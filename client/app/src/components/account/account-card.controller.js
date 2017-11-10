;(function () {
  'use strict'

  /**
   * NOTE This component uses the entire AccountController yet: it's the first
   * step to refactor the `index.html`
   */

  angular
    .module('arkclient.components')
    .component('accountCard', {
      templateUrl: 'src/components/account/templates/account-card.html',
      bindings: {
        accountCtrl: '=',
        addressBookCtrl: '='
      },
      controller: ['$scope', '$mdDialog', '$mdBottomSheet', 'gettextCatalog', 'accountService', 'storageService', 'toastService', AccountCardController]
    })

  function AccountCardController ($scope, $mdDialog, $mdBottomSheet, gettextCatalog, accountService, storageService, toastService) {

    this.$onInit = () => {
      this.ul = this.accountCtrl
      this.ab = this.addressBookCtrl
    }

    // 1 ARK has 100000000 "arkthosi"
    const UNIT = Math.pow(10, 8)

    /**
     * Show the account menu in the bottom sheet
     */
    this.showAccountMenu = (selectedAccount) => {
      const items = [
        { name: gettextCatalog.getString('Open in explorer'), icon: 'open_in_new' }
      ]

      if (!selectedAccount.ledger) {
        items.push({ name: gettextCatalog.getString('Remove'), icon: 'clear' })
      }
      if (!selectedAccount.delegate) {
        items.push({ name: gettextCatalog.getString('Label'), icon: 'local_offer' })

        if (!selectedAccount.ledger) {
          items.push({ name: gettextCatalog.getString('Register Delegate'), icon: 'perm_identity' })
        }
      }

      items.push({ name: gettextCatalog.getString('Timestamp Document'), icon: 'verified_user' })

      if (!selectedAccount.secondSignature && !selectedAccount.ledger) {
        items.push({ name: gettextCatalog.getString('Second Passphrase'), icon: 'lock' })
      }

      const answer = (action) => {
        $mdBottomSheet.hide()

        if (action === gettextCatalog.getString('Open in explorer')) {
          this.accountCtrl.openExplorer('/address/' + selectedAccount.address)
        }

        if (action === gettextCatalog.getString('Timestamp Document')) {
          this.accountCtrl.timestamp(selectedAccount)

        } else if (action === gettextCatalog.getString('Remove')) {
          const confirm = $mdDialog.confirm()
            .title(gettextCatalog.getString('Remove Account') + ' ' + selectedAccount.address)
            .theme(this.accountCtrl.currentTheme)
            .textContent(gettextCatalog.getString('Remove this account from your wallet. ' +
              'The account may be added again using the original passphrase of the account.'))
            .ok(gettextCatalog.getString('Remove account'))
            .cancel(gettextCatalog.getString('Cancel'))

          $mdDialog.show(confirm).then(function () {
            accountService.removeAccount(selectedAccount).then(function () {
              this.accountCtrl.accounts = accountService.loadAllAccounts()

              if (this.accountCtrl.accounts.length > 0) {
                selectAccount(this.accountCtrl.accounts[0])
              } else {
                this.accountCtrl.selected = null
              }

              toastService.success('Account removed!', 3000)
            })
          })
        } else if (action === gettextCatalog.getString('Register Delegate')) {
          this.accountCtrl.createDelegate(selectedAccount)

        } else if (action === gettextCatalog.getString('Label')) {
          const prompt = $mdDialog.prompt()
            .title(gettextCatalog.getString('Label'))
            .theme(this.accountCtrl.currentTheme)
            .textContent(gettextCatalog.getString('Please enter a short label.'))
            .placeholder(gettextCatalog.getString('label'))
            .ariaLabel(gettextCatalog.getString('Label'))
            .ok(gettextCatalog.getString('Set'))
            .cancel(gettextCatalog.getString('Cancel'))

          $mdDialog.show(prompt).then(function (label) {
            accountService.setUsername(selectedAccount.address, label)
            this.accountCtrl.accounts = accountService.loadAllAccounts()
            toastService.success('Label set', 3000)
          })

        } else if (action === gettextCatalog.getString('Second Passphrase')) {
          this.accountCtrl.createSecondPassphrase(selectedAccount)
        }
      }

      $scope.bs = {
        address: selectedAccount.address,
        answer: answer,
        items: items
      }

      $mdBottomSheet.show({
        parent: angular.element(document.getElementById('app')),
        templateUrl: 'src/components/account/templates/account-menu.html',
        clickOutsideToClose: true,
        preserveScope: true,
        scope: $scope
      })
    }

    this.showSendTransaction = (selectedAccount) => {
      const passphrases = accountService.getPassphrases(selectedAccount.address)

      let data = {
        ledger: selectedAccount.ledger,
        fromAddress: selectedAccount ? selectedAccount.address : '',
        secondSignature: selectedAccount ? selectedAccount.secondSignature : '',
        passphrase: passphrases[0] ? passphrases[0] : '',
        secondpassphrase: passphrases[1] ? passphrases[1] : ''
      }

      const openFile = () => {
        var fs = require('fs')

        require('electron').remote.dialog.showOpenDialog( (fileNames) => {
          if (fileNames === undefined) return
          var fileName = fileNames[0]

          fs.readFile(fileName, 'utf8', (err, data) => {
            if (err) {
              toastService.error('Unable to load file' + ': ' + err)
            } else {
              try {
                var transaction = JSON.parse(data)

                if (transaction.type === undefined) {
                  return toastService.error('Invalid transaction file')
                }

                this.accountCtrl.showValidateTransaction(selectedAccount, transaction)
              } catch (ex) {
                toastService.error('Invalid file format')
              }
            }
          })
        })
      }

      // testing goodies
      // var data={
      //   fromAddress: selectedAccount ? selectedAccount.address: '',
      //   secondSignature: selectedAccount ? selectedAccount.secondSignature: '',
      //   passphrase: 'insect core ritual alcohol clinic opera aisle dial entire dust symbol vintage',
      //   secondpassphrase: passphrases[1] ? passphrases[1] : '',
      //   toAddress: 'AYxKh6vwACWicSGJATGE3rBreFK7whc7YA',
      //   amount: 1,
      // }
      function totalBalance (minusFee) {
        var fee = 10000000
        var balance = selectedAccount.balance
        return accountService.numberToFixed((minusFee ? balance - fee : balance) / UNIT)
      }

      function fillSendableBalance () {
        var sendableBalance = totalBalance(true)
        $scope.send.data.amount = sendableBalance > 0 ? sendableBalance : 0
      }

      const submit = () => {
        if (!$scope.sendArkForm.$valid) {
          return
        }

        // in case of data selected from contacts
        if ($scope.send.data.toAddress.address) {
          $scope.send.data.toAddress = $scope.send.data.toAddress.address
        }
        // remove bad characters before and after in case of bad copy/paste
        $scope.send.data.toAddress = $scope.send.data.toAddress.trim()
        $scope.send.data.passphrase = $scope.send.data.passphrase.trim()
        if ($scope.send.data.secondpassphrase) {
          $scope.send.data.secondpassphrase = $scope.send.data.secondpassphrase.trim()
        }

        $mdDialog.hide()
        accountService.createTransaction(0, {
          ledger: selectedAccount.ledger,
          publicKey: selectedAccount.publicKey,
          fromAddress: $scope.send.data.fromAddress,
          toAddress: $scope.send.data.toAddress,
          amount: parseInt(($scope.send.data.amount * UNIT).toFixed(0)),
          smartbridge: $scope.send.data.smartbridge,
          masterpassphrase: $scope.send.data.passphrase,
          secondpassphrase: $scope.send.data.secondpassphrase

        }).then( (transaction) => {
            console.log(transaction)
            this.accountCtrl.showValidateTransaction(selectedAccount, transaction)
          },
          this.accountCtrl.formatAndToastError
        )
      }

      function searchTextChange (text) {
        $scope.send.data.toAddress = text
      }

      function selectedContactChange (contact) {
        if (contact) {
          $scope.send.data.toAddress = contact.address
        }
      }

      const querySearch = (text) => {
        text = text.toLowerCase()

        let accounts = this.accountCtrl.getAllAccounts()
        let contacts = storageService.get('contacts') || []

        contacts = contacts.concat(accounts).sort(function (a, b) {
          if (a.name && b.name) return a.name < b.name
          else if (a.username && b.username) return a.username < b.username
          else if (a.username && b.name) return a.username < b.name
          else if (a.name && b.username) return a.name < b.username
        })

        return contacts.filter(function (account) {
          return (account.address.toLowerCase().indexOf(text) > -1) || (account.name && (account.name.toLowerCase().indexOf(text) > -1))
        })
      }

      function cancel () {
        $mdDialog.hide()
      }

      function checkContacts (input) {
        if (input[0] !== '@') return true
      }

      $scope.ac = this.accountCtrl

      $scope.send = {
        openFile: openFile,
        data: data,
        cancel: cancel,
        submit: submit,
        checkContacts: checkContacts,
        searchTextChange: searchTextChange,
        selectedContactChange: selectedContactChange,
        querySearch: querySearch,
        fillSendableBalance: fillSendableBalance,
        totalBalance: totalBalance(false),
        remainingBalance: totalBalance(false) // <-- initial value, this will change by directive
      }

      $mdDialog.show({
        parent: angular.element(document.getElementById('app')),
        templateUrl: './src/components/account/templates/send-transaction-dialog.html',
        clickOutsideToClose: false,
        preserveScope: true,
        scope: $scope
      })
    }
  }

})()
